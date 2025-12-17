import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const { email, token, newPassword } = await request.json();

        if (!email || !token || !newPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Find valid reset token
        const resetResult = await query(
            `SELECT token_hash, expires_at FROM password_resets 
       WHERE email = $1 AND expires_at > NOW() 
       ORDER BY created_at DESC LIMIT 1`,
            [normalizedEmail]
        );

        if (resetResult.rows.length === 0) {
            return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
        }

        const { token_hash, expires_at } = resetResult.rows[0];

        // Verify token
        const validToken = await bcrypt.compare(token, token_hash);
        if (!validToken) {
            return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
        }

        // Update password
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await query('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, normalizedEmail]);

        // Delete used token
        await query('DELETE FROM password_resets WHERE email = $1', [normalizedEmail]);

        return NextResponse.json({
            success: true,
            message: 'Password reset successfully. You can now log in with your new password.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
