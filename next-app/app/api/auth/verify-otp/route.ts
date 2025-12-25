import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.API_SECRET_KEY;

export async function POST(request: NextRequest) {
    try {
        const { email, otp } = await request.json();

        if (!email || !otp) {
            return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 1. Fetch OTP from DB
        const result = await query(
            'SELECT otp_code, expires_at FROM email_verification_otps WHERE email = $1',
            [normalizedEmail]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 });
        }

        const { otp_code, expires_at } = result.rows[0];

        // 2. Check Expiry
        if (new Date() > new Date(expires_at)) {
            return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
        }

        // 3. Check Code Match
        if (otp_code !== otp.trim()) {
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        // 4. Generate Verification Token (valid for 1 hour to complete registration)
        // This token proves we verified the email
        const verificationToken = jwt.sign(
            { email: normalizedEmail, verified: true, type: 'registration_verification' },
            JWT_SECRET!,
            { expiresIn: '1h' }
        );

        // Optional: Clean up OTP immediately or let it expire? 
        // Better to clean up to prevent replay if we didn't use tokens, but with tokens we are safe.
        // We delete it so it can't be used again for another token generation.
        await query('DELETE FROM email_verification_otps WHERE email = $1', [normalizedEmail]);

        return NextResponse.json({
            success: true,
            message: 'Email verified successfully',
            verificationToken
        });

    } catch (error) {
        console.error('Verify OTP error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
