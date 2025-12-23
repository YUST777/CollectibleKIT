import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || process.env.API_SECRET_KEY;
const JWT_EXPIRES_IN = '7d';

// Add type definition for global
declare global {
    var authLoginRateLimits: Map<string, { count: number, lastAttempt: number }> | undefined;
}

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        if (!JWT_SECRET) {
            console.error('JWT_SECRET not configured');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Rate Limiting (In-Memory by IP) - 5 attempts per 60 seconds
        const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') || 'unknown';

        if (clientIP !== 'unknown' && clientIP !== '::1') {
            if (!global.authLoginRateLimits) {
                global.authLoginRateLimits = new Map();
            }

            const now = Date.now();
            const record = global.authLoginRateLimits.get(clientIP) || { count: 0, lastAttempt: 0 };

            // Reset count if window passed
            if (now - record.lastAttempt > 60000) {
                record.count = 0;
                record.lastAttempt = now;
            }

            if (record.count >= 5) {
                const waitSeconds = Math.ceil((60000 - (now - record.lastAttempt)) / 1000);
                return NextResponse.json(
                    { error: `Too many login attempts. Please wait ${waitSeconds}s.` },
                    { status: 429 }
                );
            }

            record.count++;
            global.authLoginRateLimits.set(clientIP, record);
        }

        // Find user by email
        const userResult = await query(
            'SELECT id, email, password_hash, application_id FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        const user = userResult.rows[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        // Update last login time
        await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, userId: user.id },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Log successful login
        // clientIP is already defined at the top
        const userAgent = request.headers.get('user-agent') || 'unknown';

        try {
            await query(
                'INSERT INTO login_logs (user_id, ip_address, user_agent) VALUES ($1, $2, $3)',
                [user.id, clientIP, userAgent]
            );
        } catch (logError) {
            console.error('Error logging login:', logError);
        }

        return NextResponse.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
