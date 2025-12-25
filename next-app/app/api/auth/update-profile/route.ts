import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';
import { scrapeCodeforces, extractUsername } from '@/lib/codeforces';

const JWT_SECRET = process.env.JWT_SECRET || process.env.API_SECRET_KEY;

interface JWTPayload {
    id: number;
    email: string;
    userId: number;
}

export async function POST(request: NextRequest) {
    try {
        // Get token from Authorization header
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'No token provided' }, { status: 401 });
        }

        if (!JWT_SECRET) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Verify token
        let decoded: JWTPayload;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        } catch (err) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }

        const userId = decoded.id || decoded.userId;
        const body = await request.json();
        const { telegram_username, codeforces_profile, leetcode_profile } = body;

        // Get user to find application_id
        const userResult = await query('SELECT application_id FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const applicationId = userResult.rows[0].application_id;

        // Update user's telegram_username if provided (plaintext for display)
        if (telegram_username !== undefined) {
            await query('UPDATE users SET telegram_username = $1 WHERE id = $2', [telegram_username, userId]);
        }

        // Update codeforces_profile in users table
        let scrapedData = null;
        if (codeforces_profile !== undefined) {
            await query('UPDATE users SET codeforces_handle = $1 WHERE id = $2', [codeforces_profile, userId]);

            // Auto-scrape on save (Smart Refresh)
            if (codeforces_profile && codeforces_profile.trim() !== '') {
                const username = extractUsername(codeforces_profile, 'codeforces');
                if (username) {
                    scrapedData = await scrapeCodeforces(username);
                    if (scrapedData) {
                        await query(
                            'UPDATE users SET codeforces_data = $1 WHERE id = $2',
                            [JSON.stringify(scrapedData), userId]
                        );
                    }
                }
            }
        }

        // Update application if exists
        if (applicationId) {
            const updates: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (telegram_username !== undefined) {
                updates.push(`telegram_username = $${paramIndex++}`);
                values.push(telegram_username);
            }
            if (codeforces_profile !== undefined) {
                updates.push(`codeforces_profile = $${paramIndex++}`);
                values.push(codeforces_profile);
            }
            if (leetcode_profile !== undefined) {
                updates.push(`leetcode_profile = $${paramIndex++}`);
                values.push(leetcode_profile);
            }

            if (updates.length > 0) {
                values.push(applicationId);
                await query(
                    `UPDATE applications SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
                    values
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Profile updated successfully',
            codeforcesData: scrapedData
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
