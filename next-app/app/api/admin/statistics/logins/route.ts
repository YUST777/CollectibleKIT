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

        // 2. Total logins (all time)
        const totalLoginsResult = await query('SELECT COUNT(*) as total FROM login_logs');
        stats.totalLogins = parseInt(totalLoginsResult.rows[0].total);

        // 3. Unique users who logged in
        const uniqueLoginsResult = await query('SELECT COUNT(DISTINCT user_id) as count FROM login_logs');
        stats.uniqueLoggedInUsers = parseInt(uniqueLoginsResult.rows[0].count);

        // 4. Logins in last 7 days
        const last7DaysResult = await query(`
            SELECT COUNT(*) as count FROM login_logs 
            WHERE logged_in_at >= NOW() - INTERVAL '7 days'
        `);
        stats.loginsLast7Days = parseInt(last7DaysResult.rows[0].count);

        // 5. Logins in last 24 hours
        const last24HoursResult = await query(`
            SELECT COUNT(*) as count FROM login_logs 
            WHERE logged_in_at >= NOW() - INTERVAL '24 hours'
        `);
        stats.loginsLast24Hours = parseInt(last24HoursResult.rows[0].count);

        // 6. Top 10 most active users (by login count)
        const topUsersResult = await query(`
            SELECT u.email, COUNT(l.id) as login_count, MAX(l.logged_in_at) as last_login
            FROM login_logs l
            JOIN users u ON l.user_id = u.id
            GROUP BY u.email
            ORDER BY login_count DESC
            LIMIT 10
        `);
        stats.topActiveUsers = topUsersResult.rows.map(row => ({
            email: row.email,
            count: parseInt(row.login_count),
            lastLogin: row.last_login
        }));

        // 7. Login timeline (last 30 days)
        const timelineResult = await query(`
            SELECT DATE(logged_in_at) as date, COUNT(*) as count 
            FROM login_logs 
            WHERE logged_in_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(logged_in_at) 
            ORDER BY date DESC
        `);
        stats.loginTimeline = timelineResult.rows.map(row => ({
            date: row.date,
            count: parseInt(row.count)
        }));

        return NextResponse.json(stats);

    } catch (error) {
        console.error('Error fetching login stats:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
