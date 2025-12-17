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

        // Get application data (profile info)
        let profile: any = null;
        if (user.application_id) {
            const appResult = await query(
                'SELECT id, name, faculty, student_id, student_level, codeforces_profile, leetcode_profile, telegram_username, application_type, submitted_at FROM applications WHERE id = $1',
                [user.application_id]
            );

            if (appResult.rows.length > 0) {
                profile = appResult.rows[0];
            }
        }

        // If no profile, use user's info
        if (!profile) {
            profile = {};
        }
        if (!profile.telegram_username && user.telegram_username) {
            profile.telegram_username = user.telegram_username;
        }

        // Add codeforces_data from users table (priority source)
        if (user.codeforces_data) {
            if (typeof user.codeforces_data === 'string') {
                try {
                    profile.codeforces_data = JSON.parse(user.codeforces_data);
                } catch (e) {
                    console.error('Error parsing codeforces_data:', e);
                    profile.codeforces_data = null;
                }
            } else {
                profile.codeforces_data = user.codeforces_data;
            }
        }

        // Use codeforces_handle from users table (plaintext) for display
        if (user.codeforces_handle) {
            profile.codeforces_profile = user.codeforces_handle;
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                isVerified: user.is_verified,
                lastLogin: user.last_login_at,
                createdAt: user.created_at,
                role: user.role || 'trainee'
            },
            profile
        }, { headers });

    } catch (error) {
        console.error('Error getting user profile:', error);
        // Log full error for debugging
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
        return NextResponse.json({ error: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500, headers });
    }
}
