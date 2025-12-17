import { NextRequest, NextResponse } from 'next/server';
import { validateAdminRequest } from '@/lib/admin-auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const authResponse = await validateAdminRequest(req);
        if (authResponse) return authResponse;

        const stats: any = {};

        // 1. Total submissions
        const totalResult = await query('SELECT COUNT(*) as total FROM sheet_submissions');
        stats.totalSubmissions = parseInt(totalResult.rows[0].total);

        // 2. Submissions per user (top 20)
        const perUserResult = await query(`
            SELECT 
                u.id,
                u.email,
                COUNT(s.id) as submission_count,
                COUNT(DISTINCT s.sheet_name) as sheets_attempted,
                COUNT(DISTINCT s.problem_name) as problems_solved,
                STRING_AGG(DISTINCT s.sheet_name, ', ') as sheets_list
            FROM sheet_submissions s
            JOIN users u ON s.user_id = u.id
            GROUP BY u.id, u.email
            ORDER BY submission_count DESC
            LIMIT 20
        `);
        stats.topUsers = perUserResult.rows.map(row => ({
            email: row.email,
            submissions: parseInt(row.submission_count),
            sheets: parseInt(row.sheets_attempted),
            problems: parseInt(row.problems_solved),
            sheetsList: row.sheets_list
        }));

        // 3. Submissions per problem (difficulty proxy)
        const perProblemResult = await query(`
            SELECT 
                sheet_name,
                problem_name,
                COUNT(*) as count,
                COUNT(DISTINCT user_id) as unique_solvers
            FROM sheet_submissions 
            GROUP BY sheet_name, problem_name 
            ORDER BY count DESC
            LIMIT 20
        `);
        stats.popularProblems = perProblemResult.rows.map(row => ({
            sheet: row.sheet_name,
            problem: row.problem_name,
            submissions: parseInt(row.count),
            solvers: parseInt(row.unique_solvers)
        }));

        // 4. Submissions timeline (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const timelineResult = await query(`
            SELECT DATE(submitted_at) as date, COUNT(*) as count 
            FROM sheet_submissions 
            WHERE submitted_at >= $1 
            GROUP BY DATE(submitted_at) 
            ORDER BY date DESC
        `, [thirtyDaysAgo.toISOString()]);
        stats.timeline = timelineResult.rows.map(row => ({ date: row.date, count: parseInt(row.count) }));

        return NextResponse.json(stats);

    } catch (error) {
        console.error('Error fetching submission stats:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
