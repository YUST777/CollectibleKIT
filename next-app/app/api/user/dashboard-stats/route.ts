import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || process.env.API_SECRET_KEY;

interface JWTPayload {
    id: number;
    email: string;
    userId: number;
}

export async function GET(request: NextRequest) {
    // Set cache control headers to prevent caching of dynamic stats
    const headers = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    };

    try {
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'No token provided' }, { status: 401, headers });
        }

        if (!JWT_SECRET) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500, headers });
        }

        let decoded: JWTPayload;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        } catch (err) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers });
        }

        const userId = decoded.id || decoded.userId;

        // Fetch user submissions
        const result = await query(
            `SELECT id, sheet_name, problem_name, submitted_at 
             FROM sheet_submissions 
             WHERE user_id = $1 
             ORDER BY submitted_at DESC`,
            [userId]
        );

        const submissions = result.rows;

        // --- Calculate Stats ---

        // 1. Total Problems Solved (Unique problems)
        // Create a set of "sheet_name/problem_name" to count uniques efficiently
        const solvedProblems = new Set(submissions.map(s => `${s.sheet_name}/${s.problem_name}`));
        const totalSolved = solvedProblems.size;

        // 2. Streak Calculation
        const uniqueDates = Array.from(new Set(submissions.map(s => {
            const date = new Date(s.submitted_at);
            return date.toISOString().split('T')[0]; // YYYY-MM-DD
        }))).sort().reverse(); // Newest first

        let streak = 0;
        const today = new Date().toISOString().split('T')[0];
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = yesterdayDate.toISOString().split('T')[0];

        // Check if user solved something today or yesterday to start the streak
        let currentDateCheck = today;
        if (!uniqueDates.includes(today)) {
            if (uniqueDates.includes(yesterday)) {
                currentDateCheck = yesterday;
            } else {
                // Streak broken if not solved yesterday either
                streak = 0;
            }
        }

        if (uniqueDates.includes(currentDateCheck)) {
            streak = 1;
            let checkDate = new Date(currentDateCheck);

            // Iterate backwards
            for (let i = 1; i < uniqueDates.length; i++) {
                checkDate.setDate(checkDate.getDate() - 1);
                const checkString = checkDate.toISOString().split('T')[0];

                if (uniqueDates.includes(checkString)) {
                    streak++;
                } else {
                    break;
                }
            }
        }

        // 3. Consistency Data (Last 28 days for heatmap)
        // Return a map of date -> count
        const consistencyMap: Record<string, number> = {};
        submissions.forEach(s => {
            const date = new Date(s.submitted_at).toISOString().split('T')[0];
            consistencyMap[date] = (consistencyMap[date] || 0) + 1;
        });

        // 4. Quiz 1 Progress (Mini Quiz #1)
        // Filter submissions where sheet_name contains "Quiz" and "1"
        const quiz1Problems = new Set(
            submissions
                .filter(s => s.sheet_name && s.sheet_name.includes('Quiz') && s.sheet_name.includes('1'))
                .map(s => s.problem_name)
        );
        const quiz1Solved = quiz1Problems.size;
        const isQuiz1Complete = quiz1Solved >= 3;

        // 5. Approval Camp Progress (Milestones)
        // Milestone 1: Quiz 1 Completed
        // Milestone 2-4: Placeholder for future sessions/quizzes
        const approvalProgress = (isQuiz1Complete ? 1 : 0);

        return NextResponse.json({
            streak,
            totalSolved,
            consistencyMap,
            quiz1Solved,
            isQuiz1Complete,
            approvalProgress
        }, { headers });

    } catch (error) {
        console.error('Error calculating dashboard stats:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500, headers });
    }
}
