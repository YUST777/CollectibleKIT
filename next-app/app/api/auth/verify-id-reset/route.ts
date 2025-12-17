import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const { email, nationalId } = await req.json();

        if (!email || !nationalId) {
            return NextResponse.json({ error: 'Email and National ID are required' }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedId = nationalId.trim();

        // 1. Find application by email
        const userCheck = await query(
            `SELECT a.id, a.email, a.national_id, u.id as user_id
             FROM applications a
             LEFT JOIN users u ON LOWER(u.email) = LOWER(a.email)
             WHERE LOWER(a.email) = $1`,
            [normalizedEmail]
        );

        if (userCheck.rows.length === 0) {
            // Timing attack mitigation
            await new Promise(resolve => setTimeout(resolve, 200));
            return NextResponse.json({ error: 'Invalid email or National ID' }, { status: 401 });
        }

        const application = userCheck.rows[0];

        // 2. Decrypt and verify National ID
        let decryptedId: string | null = null;
        try {
            decryptedId = decrypt(application.national_id);
        } catch (decryptError) {
            console.error('Decryption error:', decryptError);
            return NextResponse.json({ error: 'System error. Please try email method or contact support.' }, { status: 500 });
        }

        if (decryptedId !== normalizedId) {
            await new Promise(resolve => setTimeout(resolve, 200));
            return NextResponse.json({ error: 'Invalid email or National ID' }, { status: 401 });
        }

        // 3. Verify user account exists
        if (!application.user_id) {
            return NextResponse.json({ error: 'No account found. Please register first.' }, { status: 401 });
        }

        // 4. Generate temporary reset token (30 mins)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        // 5. Store in DB
        await query(
            'INSERT INTO password_resets (email, token_hash, expires_at) VALUES ($1, $2, $3)',
            [normalizedEmail, tokenHash, expiresAt]
        );

        console.log(`✅ [ID Verification] User ${normalizedEmail} verified identity with National ID`);

        return NextResponse.json({
            success: true,
            token: resetToken,
            message: 'Identity verified successfully!'
        });

    } catch (error) {
        console.error('Verify ID error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
