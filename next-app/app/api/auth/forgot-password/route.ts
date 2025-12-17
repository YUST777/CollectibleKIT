import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();
        if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

        const normalizedEmail = email.trim().toLowerCase();

        // Check if user exists
        const userResult = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);

        // Cleanup old tokens for this email
        await query('DELETE FROM password_resets WHERE email = $1', [normalizedEmail]);

        if (userResult.rows.length === 0) {
            // Return success even if user not found (security best practice)
            return NextResponse.json({
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent.'
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = await bcrypt.hash(resetToken, 10);
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        // Store token in database
        await query(
            'INSERT INTO password_resets (email, token_hash, expires_at) VALUES ($1, $2, $3)',
            [normalizedEmail, tokenHash, expiresAt]
        );

        // In production, send email here
        // For now, just log the token for testing
        console.log(`Password reset token for ${normalizedEmail}: ${resetToken}`);

        return NextResponse.json({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent.'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
