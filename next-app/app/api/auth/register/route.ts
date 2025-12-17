import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || process.env.API_SECRET_KEY;
const JWT_EXPIRES_IN = '7d';
const SALT_ROUNDS = 10;

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        if (!JWT_SECRET) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check if user already exists
        const existingUser = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
        if (existingUser.rows.length > 0) {
            return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
        }

        // Check if application exists
        const appResult = await query(
            'SELECT id, name FROM applications WHERE email = $1',
            [normalizedEmail]
        );

        if (appResult.rows.length === 0) {
            return NextResponse.json({ error: 'Application not found. Please apply first.' }, { status: 400 });
        }

        const application = appResult.rows[0];

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user account
        const userResult = await query(
            `INSERT INTO users (email, password_hash, application_id, is_verified, created_at)
       VALUES ($1, $2, $3, true, NOW())
       RETURNING id, email`,
            [normalizedEmail, passwordHash, application.id]
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
