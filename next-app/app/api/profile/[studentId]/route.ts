import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { trainingSheets } from '@/lib/problems';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ studentId: string }> }
) {
    try {
        const { studentId } = await params;

        if (!studentId) {
            return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
        }

        const studentIdPart = studentId.replace(/\D/g, '');

        // 1. Find user by email prefix (student ID)
        // Note: Using ILIKE for case-insensitivity consistency
        const userResult = await query(
            `SELECT u.id, u.role, u.profile_visibility, u.created_at, u.application_id
             FROM users u
             WHERE u.email LIKE $1`,
            [studentIdPart + '@%']
        );

        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const user = userResult.rows[0];

        // 2. Check if profile is private
        if (user.profile_visibility === 'private') {
            return NextResponse.json({ error: 'This profile is private' }, { status: 403 });
        }

        // 3. Get application data
        let application: any = {};
        if (user.application_id) {
            const appResult = await query(
                `SELECT id, name, faculty, student_level, codeforces_profile, leetcode_profile, telegram_username,
                codeforces_data, application_type, submitted_at
                 FROM applications 
                 WHERE id = $1`,
                [user.application_id]
            );

            if (appResult.rows.length > 0) {
                application = appResult.rows[0];
            }
        }

        let codeforcesData = null;
        if ((application as any).codeforces_data) {
            try {
                codeforcesData = typeof (application as any).codeforces_data === 'string'
                    ? JSON.parse((application as any).codeforces_data)
                    : (application as any).codeforces_data;
            } catch (e) {
                codeforcesData = null;
            }
        }

        // 5. Structure the response
        const profile = {
            id: user.id,
            name: application.name || 'Unknown User',
            role: user.role,
            faculty: application.faculty,
            student_level: application.student_level,
            codeforces_profile: application.codeforces_profile,
            leetcode_profile: application.leetcode_profile,
            telegram: { username: application.telegram_username },
            codeforces_data: codeforcesData,
            joined_at: user.created_at,
            achievementsCount: 0,
            achievements: []
        };

        // Calculate achievements
        const sheet1 = trainingSheets['sheet-1'];
        let isSheet1Unlocked = false;

        if (sheet1) {
            const totalProblems = sheet1.totalProblems;
            const solvedResult = await query(
                `SELECT COUNT(DISTINCT problem_id) as solved_count 
                  FROM training_submissions 
                  WHERE user_id = $1 AND sheet_id = $2 AND verdict = 'Accepted'`,
                [user.id, 'sheet-1']
            );
            const solvedCount = parseInt(solvedResult.rows[0]?.solved_count || '0');
            isSheet1Unlocked = solvedCount >= totalProblems;
        }

        const achievements = [
            {
                id: 'welcome',
                name: 'Welcome Badge',
                rarity: 'common',
                unlocked: true,
            },
            {
                id: 'approval',
                name: 'Approval Camp',
                rarity: 'rare',
                unlocked: false, // Currently manual/static
            },
            {
                id: '500pts',
                name: '500+ Rating',
                rarity: 'rare',
                unlocked: !!(codeforcesData && (codeforcesData as any).rating >= 500),
            },

            {
                id: 'instructor',
                name: 'Instructor',
                rarity: 'legendary',
                unlocked: user.role === 'instructor' || user.role === 'owner',
            },
            {
                id: 'sheet-1',
                name: 'Sheet 1 Solved',
                rarity: 'rare',
                unlocked: isSheet1Unlocked,
            }
        ];

        (profile as any).achievements = achievements;
        (profile as any).achievementsCount = achievements.filter(a => a.unlocked).length;

        // Cache public profiles for 60 seconds
        return NextResponse.json({
            success: true,
            profile
        }, {
            headers: {
                'Cache-Control': 'public, max-age=60, stale-while-revalidate=120'
            }
        });

    } catch (error) {
        console.error('Fetch public profile error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
