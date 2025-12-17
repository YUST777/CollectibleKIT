import { NextRequest, NextResponse } from 'next/server';
import { validateAdminRequest } from '@/lib/admin-auth';
import { query } from '@/lib/db';
import { decrypt } from '@/lib/crypto';

export async function GET(req: NextRequest) {
    try {
        // Run Admin Auth Checks
        const authResponse = await validateAdminRequest(req);
        if (authResponse) return authResponse;

        const stats: any = {};

        // 1. Total applications
        const totalResult = await query('SELECT COUNT(*) as total FROM applications');
        stats.total = parseInt(totalResult.rows[0].total);

        // 2. By application type
        const byTypeResult = await query('SELECT application_type, COUNT(*) as count FROM applications GROUP BY application_type');
        stats.byType = {};
        byTypeResult.rows.forEach(row => {
            stats.byType[row.application_type || 'trainee'] = parseInt(row.count);
        });

        // 3. By faculty
        const byFacultyResult = await query('SELECT faculty, COUNT(*) as count FROM applications GROUP BY faculty ORDER BY count DESC');
        stats.byFaculty = byFacultyResult.rows.map(row => ({ faculty: row.faculty, count: parseInt(row.count) }));

        // 4. By student level
        const byLevelResult = await query('SELECT student_level, COUNT(*) as count FROM applications GROUP BY student_level ORDER BY student_level');
        stats.byLevel = byLevelResult.rows.map(row => ({ level: row.student_level, count: parseInt(row.count) }));

        // 5. Laptop statistics
        const withLaptop = parseInt((await query('SELECT COUNT(*) as count FROM applications WHERE has_laptop = true')).rows[0].count);
        const withoutLaptop = parseInt((await query('SELECT COUNT(*) as count FROM applications WHERE has_laptop = false')).rows[0].count);
        stats.laptop = { with: withLaptop, without: withoutLaptop };

        // 6. Gender distribution (from National ID)
        // Note: This requires decrypting all IDs, so it might be slow on large datasets
        let maleCount = 0;
        let femaleCount = 0;
        const allAppsResult = await query('SELECT national_id FROM applications');
        allAppsResult.rows.forEach(app => {
            const nationalID = decrypt(app.national_id);
            if (nationalID && nationalID.length === 14) {
                const genderDigit = parseInt(nationalID[12], 10); // 13th digit (index 12) determines gender
                if (!isNaN(genderDigit)) {
                    if (genderDigit % 2 === 1) maleCount++;
                    else femaleCount++;
                }
            }
        });
        stats.gender = { male: maleCount, female: femaleCount };

        // 7. Recent applications (last 7 days)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recentResult = await query('SELECT COUNT(*) as count FROM applications WHERE submitted_at >= $1', [weekAgo.toISOString()]);
        stats.recent = parseInt(recentResult.rows[0].count);

        // 8. Applications by date (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const byDateResult = await query(`
            SELECT DATE(submitted_at) as date, COUNT(*) as count 
            FROM applications 
            WHERE submitted_at >= $1 
            GROUP BY DATE(submitted_at) 
            ORDER BY date DESC
        `, [thirtyDaysAgo.toISOString()]);
        stats.timeline = byDateResult.rows.map(row => ({ date: row.date, count: parseInt(row.count) }));

        // 9. Daily application trend (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const dailyTrendResult = await query(`
            SELECT DATE(submitted_at) as date, COUNT(*) as count 
            FROM applications 
            WHERE submitted_at >= $1 
            GROUP BY DATE(submitted_at) 
            ORDER BY date ASC
        `, [sevenDaysAgo.toISOString()]);
        stats.dailyTrend = dailyTrendResult.rows.map(row => ({ date: row.date, count: parseInt(row.count) }));

        return NextResponse.json(stats);

    } catch (error) {
        console.error('Error fetching application stats:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
