import { NextRequest, NextResponse } from 'next/server';
import { getProblem, isProblemAvailable } from '@/lib/problems';
import { query } from '@/lib/db';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; problem: string }> }
) {
    try {
        const { id: sheetId, problem: problemId } = await params;
        const problem = getProblem(sheetId, problemId);

        if (!problem) {
            return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
        }

        if (!isProblemAvailable(sheetId, problemId)) {
            return NextResponse.json({
                error: 'This problem is not available yet',
                available: false
            }, { status: 400 });
        }

        // Fetch sample test cases from database (for UI display)
        const samplesResult = await query(
            `SELECT input, expected_output as output FROM problem_test_cases
             WHERE sheet_id = $1 AND problem_id = $2 AND is_sample = TRUE
             ORDER BY ordinal ASC`,
            [sheetId, problemId]
        );

        // Get total test count from DB
        const countResult = await query(
            `SELECT COUNT(*) as count FROM problem_test_cases
             WHERE sheet_id = $1 AND problem_id = $2`,
            [sheetId, problemId]
        );

        // Use DB samples if available, otherwise fallback to hardcoded examples
        const examples = samplesResult.rows.length > 0
            ? samplesResult.rows
            : problem.examples;

        const testCaseCount = parseInt(countResult.rows[0]?.count || '0') || problem.testCases.length;

        return NextResponse.json({
            success: true,
            problem: {
                id: problem.id,
                title: problem.title,
                timeLimit: problem.timeLimit,
                memoryLimit: problem.memoryLimit,
                statement: problem.statement,
                inputFormat: problem.inputFormat,
                outputFormat: problem.outputFormat,
                examples: examples,
                testCaseCount: testCaseCount,
                note: problem.note || null,
            }
        });
    } catch (error) {
        console.error('Error fetching problem details:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
