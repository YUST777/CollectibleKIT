import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.API_SECRET_KEY || '';

function extractUsername(profileUrl: string, platform: string): string | null {
    if (!profileUrl) return null;

    try {
        // If it's already just a username (no URL)
        if (!profileUrl.includes('/') && !profileUrl.includes('.')) {
            return profileUrl.trim();
        }

        // Extract from URL
        const url = new URL(profileUrl.includes('://') ? profileUrl : `https://${profileUrl}`);
        const parts = url.pathname.split('/').filter(Boolean);

        if (platform === 'codeforces') {
            // codeforces.com/profile/username
            const profileIndex = parts.indexOf('profile');
            if (profileIndex !== -1 && parts[profileIndex + 1]) {
                return parts[profileIndex + 1];
            }
            // Direct username in path
            if (parts.length > 0) return parts[parts.length - 1];
        }

        return parts[parts.length - 1] || null;
    } catch {
        return profileUrl.trim();
    }
}

async function scrapeCodeforces(username: string): Promise<any | null> {
    try {
        const response = await fetch(`https://codeforces.com/api/user.info?handles=${username}`);
        const data = await response.json();

        if (data.status === 'OK' && data.result && data.result[0]) {
            const user = data.result[0];
            return {
                handle: user.handle,
                rating: user.rating || 0,
                maxRating: user.maxRating || 0,
                rank: user.rank || 'unrated',
                maxRank: user.maxRank || 'unrated',
                contribution: user.contribution || 0,
                friendOfCount: user.friendOfCount || 0,
                lastOnlineTimeSeconds: user.lastOnlineTimeSeconds,
                registrationTimeSeconds: user.registrationTimeSeconds
            };
        }
        return null;
    } catch (error) {
        console.error('Codeforces API error:', error);
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        // Get token from Authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        let decoded: any;

        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const userId = decoded.id || decoded.userId;
        if (!userId) {
            return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
        }

        // Get user's codeforces_handle from users table
        const userResult = await query('SELECT codeforces_handle FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const cfHandle = userResult.rows[0].codeforces_handle;
        if (!cfHandle) {
            return NextResponse.json({ error: 'No Codeforces profile linked' }, { status: 400 });
        }

        // The handle is stored in plaintext in users table
        const username = extractUsername(cfHandle, 'codeforces');

        if (!username) {
            return NextResponse.json({ error: 'Invalid Codeforces handle' }, { status: 400 });
        }

        console.log(`Manual refresh: Scraping Codeforces for ${username}`);
        const codeforcesData = await scrapeCodeforces(username);

        if (codeforcesData) {
            // Store codeforces_data in users table (not applications)
            await query(
                'UPDATE users SET codeforces_data = $1 WHERE id = $2',
                [JSON.stringify(codeforcesData), userId]
            );
            return NextResponse.json({ success: true, data: codeforcesData });
        } else {
            console.warn(`Scraping returned null for ${username}`);
            return NextResponse.json({ error: 'Failed to scrape Codeforces data' }, { status: 500 });
        }

    } catch (error) {
        console.error('Error refreshing Codeforces:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
