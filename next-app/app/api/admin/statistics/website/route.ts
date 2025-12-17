import { NextRequest, NextResponse } from 'next/server';
import { validateAdminRequest } from '@/lib/admin-auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const authResponse = await validateAdminRequest(req);
        if (authResponse) return authResponse;

        const stats: any = {};

        // 1. Total registered users
        const totalUsersResult = await query('SELECT COUNT(*) as total FROM users');
        stats.totalUsers = parseInt(totalUsersResult.rows[0].total);

        // 2. Total applications
        const totalApplicationsResult = await query('SELECT COUNT(*) as total FROM applications');
        stats.totalApplications = parseInt(totalApplicationsResult.rows[0].total);

        // 3. Applications by status
        const applicationsByStatusResult = await query(`
            SELECT status, COUNT(*) as count
            FROM applications
            GROUP BY status
            ORDER BY count DESC
        `);
        stats.applicationsByStatus = applicationsByStatusResult.rows.map(row => ({
            status: row.status,
            count: parseInt(row.count)
        }));

        // 4. Users with Codeforces profiles
        const cfUsersResult = await query("SELECT COUNT(*) as total FROM applications WHERE codeforces_profile IS NOT NULL AND codeforces_profile != ''");
        stats.usersWithCodeforces = parseInt(cfUsersResult.rows[0].total);

        // 5. Users with LeetCode profiles
        const lcUsersResult = await query("SELECT COUNT(*) as total FROM applications WHERE leetcode_profile IS NOT NULL AND leetcode_profile != ''");
        stats.usersWithLeetcode = parseInt(lcUsersResult.rows[0].total);

        return NextResponse.json(stats);

    } catch (error) {
        console.error('Error fetching website stats:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
