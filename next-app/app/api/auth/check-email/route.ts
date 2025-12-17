import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check if email exists in applications
        const appResult = await query(
            'SELECT id, name, email FROM applications WHERE email = $1',
            [normalizedEmail]
        );

        if (appResult.rows.length === 0) {
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
            name: appResult.rows[0].name
        });
    } catch (error) {
        console.error('Check email error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
