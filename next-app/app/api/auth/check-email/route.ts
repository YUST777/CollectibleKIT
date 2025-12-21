import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { decrypt } from '@/lib/crypto';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Emails are encrypted in the database, so we need to fetch all and decrypt to compare
        const appResult = await query('SELECT id, name, email FROM applications');

        let applicationId = null;
        let applicationName = null;

        for (const app of appResult.rows) {
            if (app.email) {
                try {
                    const decryptedEmail = decrypt(app.email);
                    if (decryptedEmail && decryptedEmail.toLowerCase() === normalizedEmail) {
                        applicationId = app.id;
                        applicationName = app.name;
                        break;
                    }
                } catch (decryptErr) {
                    // If decryption fails, try direct comparison (for unencrypted legacy data)
                    if (app.email.toLowerCase() === normalizedEmail) {
                        applicationId = app.id;
                        applicationName = app.name;
                        break;
                    }
                }
            }
        }

        if (!applicationId) {
            return NextResponse.json({ exists: false, hasAccount: false });
        }

        // Check if user account already exists
        const userResult = await query(
            'SELECT id FROM users WHERE email = $1',
            [normalizedEmail]
        );

        return NextResponse.json({
            exists: true,
            hasAccount: userResult.rows.length > 0,
            name: applicationName
        });
    } catch (error) {
        console.error('Check email error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
