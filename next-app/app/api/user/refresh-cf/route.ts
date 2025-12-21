import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { scrapeCodeforces, extractUsername } from '@/lib/codeforces';

const JWT_SECRET = process.env.JWT_SECRET || process.env.API_SECRET_KEY || '';

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

