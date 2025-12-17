import { NextRequest, NextResponse } from 'next/server';
import { validateAdminRequest } from '@/lib/admin-auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const authResponse = await validateAdminRequest(req);
        if (authResponse) return authResponse;

        const stats: any = {};

        // 1. Total page views
        const totalViewsResult = await query('SELECT COUNT(*) as total FROM website_analytics');
        stats.totalViews = parseInt(totalViewsResult.rows[0].total);

        // 2. Unique visitors (unique IPs)
        const uniqueVisitorsResult = await query('SELECT COUNT(DISTINCT ip_address) as total FROM website_analytics');
        stats.uniqueVisitors = parseInt(uniqueVisitorsResult.rows[0].total);

        // 3. Unique sessions
        const uniqueSessionsResult = await query('SELECT COUNT(DISTINCT session_id) as total FROM website_analytics');
        stats.uniqueSessions = parseInt(uniqueSessionsResult.rows[0].total);

        // 4. Page views by path (Top 10)
        const byPathResult = await query(`
            SELECT path, COUNT(*) as count 
            FROM website_analytics 
            GROUP BY path 
            ORDER BY count DESC 
            LIMIT 10
        `);
        stats.topPages = byPathResult.rows.map(row => ({ path: row.path, views: parseInt(row.count) }));

        // 5. Device type distribution
        const byDeviceResult = await query('SELECT device_type, COUNT(*) as count FROM website_analytics GROUP BY device_type');
        stats.deviceTypes = {};
        byDeviceResult.rows.forEach(row => {
            stats.deviceTypes[row.device_type || 'unknown'] = parseInt(row.count);
        });

        return NextResponse.json(stats);

    } catch (error) {
        // Table might not exist yet if analytics haven't run
        console.error('Error fetching analytics stats:', error);
        return NextResponse.json({
            totalViews: 0,
            uniqueVisitors: 0,
            uniqueSessions: 0,
            topPages: [],
            deviceTypes: {},
            error: 'Analytics data unavailable'
        });
    }
}
