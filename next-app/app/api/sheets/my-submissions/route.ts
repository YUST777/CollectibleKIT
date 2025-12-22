import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [uploadSubmissions, trainingSubmissions] = await Promise.all([
            query(
                `SELECT id, sheet_name, problem_name, file_name, submitted_at
                 FROM sheet_submissions
                 WHERE user_id = $1
                 ORDER BY submitted_at DESC`,
                [user.id]
            ),
            query(
                `SELECT id, sheet_id, problem_id, submitted_at
                 FROM training_submissions
                 WHERE user_id = $1 AND verdict = 'Accepted'
                 ORDER BY submitted_at DESC`,
                [user.id]
            )
        ]);

        const submissions = [
            ...uploadSubmissions.rows,
            ...trainingSubmissions.rows.map((row: any) => ({
                ...row,
                sheet_name: row.sheet_id === 'sheet-1' ? 'Sheet 1' : row.sheet_id,
                problem_name: row.problem_id
            }))
        ].sort((a: any, b: any) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

        return NextResponse.json({
            success: true,
            submissions,
            total: submissions.length
        });

    } catch (error) {
        console.error('Error getting submissions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
