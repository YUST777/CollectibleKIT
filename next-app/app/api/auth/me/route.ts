import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';
import { decrypt, hashEmail } from '@/lib/crypto';
import { trainingSheets } from '@/lib/problems';

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
            'SELECT id, email, is_verified, last_login_at, created_at, application_id, telegram_username, role, profile_visibility, codeforces_data, codeforces_handle, profile_picture FROM users WHERE id = $1',
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

        // Fallback: Try to find application by Email hash if not found by ID
        if (!profile && user.email) {
            const normalizedEmail = user.email.toLowerCase();
            const emailHashValue = hashEmail(normalizedEmail);

            // O(1) lookup using hash
            const hashResult = await query(
                'SELECT * FROM applications WHERE email_hash = $1',
                [emailHashValue]
            );

            if (hashResult.rows.length > 0) {
                profile = hashResult.rows[0];
                await query('UPDATE users SET application_id = $1 WHERE id = $2', [profile.id, user.id]);
            } else {
                // Final fallback for legacy data without hash (scan only NULL hashes)
                const legacyApps = await query('SELECT * FROM applications WHERE email_hash IS NULL');
                for (const app of legacyApps.rows) {
                    if (app.email) {
                        try {
                            const decryptedEmail = decrypt(app.email);
                            if (decryptedEmail && decryptedEmail.toLowerCase() === normalizedEmail) {
                                profile = app;
                                await query('UPDATE users SET application_id = $1 WHERE id = $2', [app.id, user.id]);
                                await query('UPDATE applications SET email_hash = $1 WHERE id = $2', [emailHashValue, app.id]);
                                break;
                            }
                        } catch {
                            if (app.email.toLowerCase() === normalizedEmail) {
                                profile = app;
                                await query('UPDATE users SET application_id = $1 WHERE id = $2', [app.id, user.id]);
                                await query('UPDATE applications SET email_hash = $1 WHERE id = $2', [emailHashValue, app.id]);
                                break;
                            }
                        }
                    }
                }
            }
        }

        // If no profile found at all, initialize empty object
        if (!profile) {
            profile = {};
        }

        // Decrypt encrypted fields from applications table
        // These fields may be encrypted if updated via update-profile endpoint
        if (profile.telegram_username) {
            try {
                const decrypted = decrypt(profile.telegram_username);
                if (decrypted) profile.telegram_username = decrypted;
            } catch (e) { /* Already plaintext, keep as-is */ }
        }
        if (profile.codeforces_profile) {
            try {
                const decrypted = decrypt(profile.codeforces_profile);
                if (decrypted) profile.codeforces_profile = decrypted;
            } catch (e) { /* Already plaintext, keep as-is */ }
        }
        if (profile.leetcode_profile) {
            try {
                const decrypted = decrypt(profile.leetcode_profile);
                if (decrypted) profile.leetcode_profile = decrypted;
            } catch (e) { /* Already plaintext, keep as-is */ }
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

        // 4. Calculate Sheet 1 Achievement
        try {
            const sheet1 = trainingSheets['sheet-1'];
            if (sheet1) {
                const totalProblems = sheet1.totalProblems;
                const solvedResult = await query(
                    `SELECT COUNT(DISTINCT problem_id) as solved_count 
                     FROM training_submissions 
                     WHERE user_id = $1 AND sheet_id = $2 AND verdict = 'Accepted'`,
                    [user.id, 'sheet-1']
                );
                const solvedCount = parseInt(solvedResult.rows[0]?.solved_count || '0');
                profile.sheet_1_solved = solvedCount >= totalProblems;
            } else {
                profile.sheet_1_solved = false;
            }
        } catch (err) {
            console.error('Error calculating Sheet 1 achievement:', err);
            profile.sheet_1_solved = false;
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user.id.toString(),
                email: user.email,
                isVerified: user.is_verified,
                lastLogin: user.last_login_at,
                createdAt: user.created_at,
                role: user.role || 'trainee',
                profile_visibility: user.profile_visibility || 'public',
                profile_picture: user.profile_picture || null
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
