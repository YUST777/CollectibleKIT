import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Extract first and last name only (skip middle names)
function getShortName(fullName: string | null): string {
    if (!fullName) return 'Anonymous';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 2) return fullName.trim();
    return `${parts[0]} ${parts[parts.length - 1]}`;
}

function extractUsername(profileUrl: string, platform: string): string | null {
    if (!profileUrl) return null;
    try {
        if (!profileUrl.includes('/') && !profileUrl.includes('.')) return profileUrl.trim();
        const url = new URL(profileUrl.includes('://') ? profileUrl : `https://${profileUrl}`);
        const parts = url.pathname.split('/').filter(Boolean);
        if (platform === 'codeforces') {
            const profileIndex = parts.indexOf('profile');
            if (profileIndex !== -1 && parts[profileIndex + 1]) return parts[profileIndex + 1];
            if (parts.length > 0) return parts[parts.length - 1];
        }
        return parts[parts.length - 1] || null;
    } catch {
        return profileUrl.trim();
    }
}

export async function GET() {
    try {
        // Disable caching
        const headers = {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        };

        // Get users with codeforces data from BOTH applications AND users tables
        // Use UNION to combine results from both sources
        // Filter by show_on_cf_leaderboard (cheaters forced visible via is_shadow_banned)
        const result = await query(`
            SELECT DISTINCT ON (COALESCE(handle, name)) 
                name, 
                handle,
                codeforces_profile, 
                codeforces_data
            FROM (
                -- From applications table (legacy, no privacy filter)
                SELECT 
                    name, 
                    codeforces_profile,
                    codeforces_data,
                    (codeforces_data::json->>'handle') as handle
                FROM applications 
                WHERE codeforces_data IS NOT NULL
                
                UNION ALL
                
                -- From users table (respects privacy unless shadow banned)
                SELECT 
                    COALESCE(a.name, u.email) as name,
                    u.codeforces_handle as codeforces_profile,
                    u.codeforces_data,
                    (u.codeforces_data::json->>'handle') as handle
                FROM users u
                LEFT JOIN applications a ON u.application_id = a.id
                WHERE u.codeforces_data IS NOT NULL
                  AND (u.show_on_cf_leaderboard = TRUE OR u.show_on_cf_leaderboard IS NULL OR u.is_shadow_banned = TRUE)
            ) combined
            ORDER BY COALESCE(handle, name)
        `);

        const leaderboard = result.rows.map((row: any) => {
            let data: any = {};
            try {
                data = typeof row.codeforces_data === 'string' ? JSON.parse(row.codeforces_data) : row.codeforces_data;
            } catch (e) {
                data = {};
            }

            const rating = parseInt(data.rating || 0, 10);
            const username = row.handle || extractUsername(row.codeforces_profile, 'codeforces') || '?';

            return {
                name: getShortName(row.name),
                handle: username,
                rating: rating,
                rank: data.rank || 'unrated',
                maxRating: parseInt(data.maxRating || 0, 10),
                profileUrl: row.codeforces_profile
            };
        })
            .filter((user: any) => user.rating > 0)
            .sort((a: any, b: any) => b.rating - a.rating);

        return NextResponse.json({ leaderboard }, { headers });
    } catch (error) {
        console.error('Leaderboard error:', error);
        return NextResponse.json({ leaderboard: [] });
    }
}
