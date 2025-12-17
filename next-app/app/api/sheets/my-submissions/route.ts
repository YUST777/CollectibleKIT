import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await query(
            `SELECT id, sheet_name, problem_name, file_name, submitted_at
             FROM sheet_submissions
             WHERE user_id = $1
             ORDER BY submitted_at DESC`,
            [user.id]
        );

        return NextResponse.json({
            success: true,
            submissions: result.rows,
            total: result.rows.length
        });

    } catch (error) {
        console.error('Error getting submissions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
