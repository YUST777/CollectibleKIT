import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';
import { decrypt, hashEmail } from '@/lib/crypto';

const JWT_SECRET = process.env.JWT_SECRET || process.env.API_SECRET_KEY;
const JWT_EXPIRES_IN = '7d';
const SALT_ROUNDS = 10;

// Add type definition for global
declare global {
    var authRegisterRateLimits: Map<string, number> | undefined;
}

export async function POST(request: NextRequest) {
    try {
        const { email, password, verificationToken } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        // Verify Verification Token if provided (Enforcing for new flow recommended)
        if (verificationToken) {
            try {
                const decoded = jwt.verify(verificationToken, JWT_SECRET!) as any;
                if (decoded.email !== email.trim().toLowerCase() || !decoded.verified || decoded.type !== 'registration_verification') {
                    return NextResponse.json({ error: 'Invalid or expired verification token' }, { status: 400 });
                }
            } catch (err) {
                return NextResponse.json({ error: 'Invalid verification session' }, { status: 400 });
            }
        }
        // NOTE: If verificationToken is NOT provided, we currently proceed (legacy behavior). 
        // You can uncomment below to ENFORCE it.
        // else { return NextResponse.json({ error: 'Email verification required' }, { status: 400 }); }

        if (!JWT_SECRET) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Rate Limiting (In-Memory by IP) - 1 attempt per 5 minutes
        const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') || 'unknown';

        if (clientIP !== 'unknown' && clientIP !== '::1') {
            if (!global.authRegisterRateLimits) {
                global.authRegisterRateLimits = new Map();
            }

            const now = Date.now();
            const lastAttempt = global.authRegisterRateLimits.get(clientIP) || 0;
            const RATE_LIMIT_DURATION = 5 * 60 * 1000; // 5 minutes

            if (now - lastAttempt < RATE_LIMIT_DURATION) {
                const waitMinutes = Math.ceil((RATE_LIMIT_DURATION - (now - lastAttempt)) / 60000);
                return NextResponse.json(
                    { error: `Please wait ${waitMinutes}m before registering another account.` },
                    { status: 429 }
                );
            }

            global.authRegisterRateLimits.set(clientIP, now);
        }

        const normalizedEmail = email.trim().toLowerCase();
        const emailHashValue = hashEmail(normalizedEmail);

        // Check if user already exists
        const existingUser = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
        if (existingUser.rows.length > 0) {
            return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
        }

        // O(1) lookup using email_hash index
        let applicationId = null;
        let applicationName = null;

        const appResult = await query(
            'SELECT id, name FROM applications WHERE email_hash = $1',
            [emailHashValue]
        );

        if (appResult.rows.length > 0) {
            applicationId = appResult.rows[0].id;
            applicationName = appResult.rows[0].name;
        } else {
            // Fallback for legacy data without hash (scan only NULL hashes)
            const legacyApps = await query('SELECT id, name, email FROM applications WHERE email_hash IS NULL');
            for (const app of legacyApps.rows) {
                if (app.email) {
                    try {
                        const decryptedEmail = decrypt(app.email);
                        if (decryptedEmail && decryptedEmail.toLowerCase() === normalizedEmail) {
                            applicationId = app.id;
                            applicationName = app.name;
                            // Backfill hash for future lookups
                            await query('UPDATE applications SET email_hash = $1 WHERE id = $2', [emailHashValue, app.id]);
                            break;
                        }
                    } catch {
                        if (app.email.toLowerCase() === normalizedEmail) {
                            applicationId = app.id;
                            applicationName = app.name;
                            await query('UPDATE applications SET email_hash = $1 WHERE id = $2', [emailHashValue, app.id]);
                            break;
                        }
                    }
                }
            }
        }

        if (!applicationId) {
            return NextResponse.json({ error: 'Application not found. Please apply first.' }, { status: 400 });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user account
        const userResult = await query(
            `INSERT INTO users (email, password_hash, application_id, is_verified, created_at)
       VALUES ($1, $2, $3, true, NOW())
       RETURNING id, email`,
            [normalizedEmail, passwordHash, applicationId]
        );

        const user = userResult.rows[0];

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, userId: user.id },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return NextResponse.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
