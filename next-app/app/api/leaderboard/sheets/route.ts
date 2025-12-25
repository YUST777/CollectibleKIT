import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// Extract first and last name, handling compound family names (Al-, Abd-, El-, etc.)
function getShortName(fullName: string | null): string {
    if (!fullName) return 'Anonymous';

    // Clean up mixed format like "nabila / نبيلة"
    const cleaned = fullName.split('/')[0].trim();
    const parts = cleaned.trim().split(/\s+/);

    if (parts.length <= 2) return cleaned.trim();

    const firstName = parts[0];
    const lastPart = parts[parts.length - 1];
    const secondToLast = parts.length > 2 ? parts[parts.length - 2] : null;

    // Common compound prefixes: Al, El, Abd, Abu, Ben, Ibn
    const compoundPrefixes = /^(al|el|abd|abu|ben|ibn)[-]?$/i;

    if (secondToLast && compoundPrefixes.test(secondToLast)) {
        return `${firstName} ${secondToLast} ${lastPart}`;
    }

    if (/^(al|el|abd|abu)-/i.test(lastPart)) {
        return `${firstName} ${lastPart}`;
    }

    return `${firstName} ${lastPart}`;
}

export async function GET(req: NextRequest) {
    try {
        // Try to get current user (optional - works for both auth and non-auth requests)
        let currentUser: { id: number } | null = null;
        let isShadowBanned = false;

        try {
            currentUser = await verifyAuth(req);
            if (currentUser) {
                // Check if user is shadow banned
                const userCheck = await query(
                    `SELECT is_shadow_banned FROM users WHERE id = $1`,
                    [currentUser.id]
                );
                isShadowBanned = userCheck.rows[0]?.is_shadow_banned === true;
            }
        } catch (authError) {
            // Not authenticated - that's fine for leaderboard
        }

        // ============================================
        // QUERY LOGIC:
        // - If cheater: Show ALL users (normal + cheaters), cheaters can't hide via privacy
        // - If normal/guest: Show only normal users with public profiles
        // ============================================

        // Privacy filter: cheaters can't hide, normal users can opt out
        // is_shadow_banned = TRUE -> always shown (can't hide)
        // otherwise respects show_on_sheets_leaderboard setting
        const privacyFilter = `(
            u.is_shadow_banned = TRUE 
            OR u.show_on_sheets_leaderboard = TRUE 
            OR u.show_on_sheets_leaderboard IS NULL
        )`;

        const shadowBanFilter = isShadowBanned
            ? '' // Cheaters see everyone (including other cheaters)
            : 'AND (u.is_shadow_banned = FALSE OR u.is_shadow_banned IS NULL)'; // Normal users don't see cheaters

        const result = await query(`
            SELECT 
                u.id,
                u.email,
                u.profile_visibility,
                u.is_shadow_banned,
                a.name,
                COUNT(DISTINCT CASE WHEN ts.verdict = 'Accepted' THEN ts.sheet_id || '-' || ts.problem_id END) as solved_count,
                COUNT(ts.id) as total_submissions,
                COUNT(CASE WHEN ts.verdict = 'Accepted' THEN 1 END) as accepted_count
            FROM users u
            INNER JOIN training_submissions ts ON u.id = ts.user_id
            LEFT JOIN applications a ON u.application_id = a.id
            WHERE ${privacyFilter}
              ${shadowBanFilter}
            GROUP BY u.id, u.email, u.profile_visibility, u.is_shadow_banned, a.name
            HAVING COUNT(CASE WHEN ts.verdict = 'Accepted' THEN 1 END) > 0
            ORDER BY 
                COUNT(DISTINCT CASE WHEN ts.verdict = 'Accepted' THEN ts.sheet_id || '-' || ts.problem_id END) DESC,
                COUNT(CASE WHEN ts.verdict = 'Accepted' THEN 1 END) DESC
            LIMIT 100
        `);

        const leaderboard = result.rows.map((row: any) => ({
            userId: row.id,
            username: getShortName(row.name) || row.email?.split('@')[0] || 'Anonymous',
            solvedCount: parseInt(row.solved_count) || 0,
            totalSubmissions: parseInt(row.total_submissions) || 0,
            acceptedCount: parseInt(row.accepted_count) || 0,
        }));

        return NextResponse.json({
            success: true,
            leaderboard
        });

    } catch (error) {
        console.error('Error fetching sheets leaderboard:', error);
        return NextResponse.json({
            success: true,
            leaderboard: []
        });
    }
}

