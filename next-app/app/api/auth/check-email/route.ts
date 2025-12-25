import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashEmail, decrypt } from '@/lib/crypto';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const emailHash = hashEmail(normalizedEmail);

        // O(1) lookup using email_hash index
        const appResult = await query(
            'SELECT id, name FROM applications WHERE email_hash = $1',
            [emailHash]
        );

        // Fallback to O(n) scan for legacy data without hash (temporary)
        if (appResult.rows.length === 0) {
            const allApps = await query('SELECT id, name, email FROM applications WHERE email_hash IS NULL');
            for (const app of allApps.rows) {
                if (app.email) {
                    try {
                        const decryptedEmail = decrypt(app.email);
                        if (decryptedEmail && decryptedEmail.toLowerCase() === normalizedEmail) {
                            // Found - update hash for future lookups
                            await query('UPDATE applications SET email_hash = $1 WHERE id = $2', [emailHash, app.id]);

                            const userResult = await query(
                                'SELECT id FROM users WHERE email = $1',
                                [normalizedEmail]
                            );
                            return NextResponse.json({
                                exists: true,
                                hasAccount: userResult.rows.length > 0,
                                name: app.name
                            });
                        }
                    } catch {
                        if (app.email.toLowerCase() === normalizedEmail) {
                            await query('UPDATE applications SET email_hash = $1 WHERE id = $2', [emailHash, app.id]);
                            const userResult = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
                            return NextResponse.json({
                                exists: true,
                                hasAccount: userResult.rows.length > 0,
                                name: app.name
                            });
                        }
                    }
                }
            }
            return NextResponse.json({ exists: false, hasAccount: false });
        }

        const app = appResult.rows[0];

        // Check if user account already exists
        const userResult = await query(
            'SELECT id FROM users WHERE email = $1',
            [normalizedEmail]
        );

        return NextResponse.json({
            exists: true,
            hasAccount: userResult.rows.length > 0,
            name: app.name
        });
    } catch (error) {
        console.error('Check email error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
