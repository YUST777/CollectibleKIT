import { NextRequest, NextResponse } from 'next/server';
import { validateAdminRequest } from '@/lib/admin-auth';
import { query } from '@/lib/db';
import { decrypt } from '@/lib/crypto';

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
        const countResult = await query('SELECT COUNT(*) as total FROM applications');
        const totalCount = parseInt(countResult.rows[0].total);

        // Get paginated applications
        const result = await query(
            'SELECT * FROM applications ORDER BY submitted_at DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );

        const applications = result.rows;

        // Decrypt sensitive fields
        applications.forEach(app => {
            if (app.national_id) app.national_id = decrypt(app.national_id);
            if (app.telephone) app.telephone = decrypt(app.telephone);
            if (app.email) app.email = decrypt(app.email);
        });

        return NextResponse.json({
            success: true,
            applications,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            totalCount
        });

    } catch (error) {
        console.error('Error fetching applications:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
