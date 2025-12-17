import { NextRequest, NextResponse } from 'next/server';
import { validateAdminRequest } from '@/lib/admin-auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        // Run Admin Auth Checks
        const authResponse = await validateAdminRequest(req);
        if (authResponse) return authResponse;

        // Pagination
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;

        // Get total count
        const countResult = await query('SELECT COUNT(*) as total FROM sheet_submissions');
        const totalCount = parseInt(countResult.rows[0].total);

        // Get paginated submissions with user email
        const result = await query(`
            SELECT 
                s.id,
                s.user_id,
                s.sheet_name,
                s.problem_name,
                s.file_name,
                s.submitted_at,
                LENGTH(s.file_content) as file_size,
                u.email as user_email
            FROM sheet_submissions s
            LEFT JOIN users u ON s.user_id = u.id
            ORDER BY s.submitted_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        return NextResponse.json({
            success: true,
            submissions: result.rows,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            totalCount
        });

    } catch (error) {
        console.error('Error fetching submissions:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
