import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || process.env.API_SECRET_KEY;

interface JWTPayload {
    id: number;
    email: string;
    userId: number;
}

export async function GET(request: NextRequest) {
    // Set cache control headers
    const headers = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    };

    try {
        // Get token from Authorization header
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'No token provided' }, { status: 401, headers });
        }

        if (!JWT_SECRET) {
            console.error('JWT_SECRET not configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500, headers });
        }

        // Verify token
        let decoded: JWTPayload;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        } catch (err) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401, headers });
        }

        const userId = decoded.id || decoded.userId;

        // Get user data
        const userResult = await query(
            'SELECT id, email, is_verified, last_login_at, created_at, application_id, telegram_username, role, profile_visibility, codeforces_data, codeforces_handle FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404, headers });
        }

        const user = userResult.rows[0];
        let profile: any = null;

        // Try to find application by specific ID first
        if (user.application_id) {
            const appResult = await query(
                'SELECT * FROM applications WHERE id = $1',
                [user.application_id]
            );

            if (appResult.rows.length > 0) {
                profile = appResult.rows[0];
            }
        }

        // Fallback: Try to find application by Email if not found by ID
        if (!profile && user.email) {
            const appResult = await query(
                'SELECT * FROM applications WHERE email = $1 ORDER BY id DESC LIMIT 1',
                [user.email]
            );

            if (appResult.rows.length > 0) {
                profile = appResult.rows[0];

                // Optional: Update the user's application_id for future faster lookups
                // await query('UPDATE users SET application_id = $1 WHERE id = $2', [profile.id, user.id]);
            }
        }

        // If no profile found at all, initialize empty object
        if (!profile) {
            profile = {};
        }

        // Merge/Override specific fields logic

        // 1. Telegram Username: User table > Application > null
        if (!profile.telegram_username && user.telegram_username) {
            profile.telegram_username = user.telegram_username;
        }

        // 2. Codeforces Data: User table (priority) > Application
        if (user.codeforces_data) {
            if (typeof user.codeforces_data === 'string') {
                try {
                    profile.codeforces_data = JSON.parse(user.codeforces_data);
                } catch (e) {
                    profile.codeforces_data = null;
                }
            } else {
                profile.codeforces_data = user.codeforces_data;
            }
        }

        // 3. Codeforces Handle: User table (priority) > Application
        if (user.codeforces_handle) {
            profile.codeforces_profile = user.codeforces_handle;
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user.id.toString(),
                email: user.email,
                isVerified: user.is_verified,
                lastLogin: user.last_login_at,
                createdAt: user.created_at,
                role: user.role || 'trainee'
            },
            profile: {
                ...profile,
                // Ensure IDs are strings if they are BigInts (which node-postgres parses as strings usually, but just in case)
                id: profile.id?.toString(),
            }
        }, { headers });

    } catch (error) {
        console.error('Error getting user profile:', error);
        return NextResponse.json({ error: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500, headers });
    }
}
