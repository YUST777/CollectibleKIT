import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { visibility } = await req.json();

        if (!['public', 'private'].includes(visibility)) {
            return NextResponse.json({ error: 'Invalid visibility. Use "public" or "private".' }, { status: 400 });
        }

        await query(
            'UPDATE users SET profile_visibility = $1 WHERE id = $2',
            [visibility, user.id]
        );

        return NextResponse.json({ success: true, visibility });

    } catch (error) {
        console.error('Error updating privacy:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
