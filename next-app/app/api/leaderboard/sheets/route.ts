import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// Extract first and last name only (skip middle names)
function getShortName(fullName: string | null): string {
    if (!fullName) return 'Anonymous';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 2) return fullName.trim();
    return `${parts[0]} ${parts[parts.length - 1]}`;
}

export async function GET(req: NextRequest) {
    try {
        // Try to get current user (optional - works for both auth and non-auth requests)
        let currentUser: { id: number } | null = null;
        let isShadowBanned = false;

        try {
            currentUser = await verifyAuth(req);
            console.log('[LEADERBOARD DEBUG] currentUser:', currentUser?.id || 'null');
            if (currentUser) {
                // Check if user is shadow banned
                const userCheck = await query(
                    `SELECT is_shadow_banned FROM users WHERE id = $1`,
                    [currentUser.id]
                );
                isShadowBanned = userCheck.rows[0]?.is_shadow_banned === true;
                console.log('[LEADERBOARD DEBUG] isShadowBanned:', isShadowBanned);
            }
        } catch (authError) {
            // Not authenticated - that's fine for leaderboard
            console.log('[LEADERBOARD DEBUG] Auth failed:', (authError as Error).message);
        }

        // ============================================
        // QUERY LOGIC:
        // - If cheater: Show ALL users (normal + cheaters), cheaters can't hide via privacy
        // - If normal/guest: Show only normal users with public profiles
        // ============================================

        // Privacy filter: cheaters can't hide, normal users can
        // is_shadow_banned = TRUE -> always shown (can't hide)
        // is_shadow_banned = FALSE/NULL -> respects profile_visibility
        const privacyFilter = `(
            u.is_shadow_banned = TRUE 
            OR u.profile_visibility = 'public' 
            OR u.profile_visibility IS NULL
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

