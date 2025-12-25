import { NextRequest, NextResponse } from 'next/server';
import { getProblem, isProblemAvailable } from '@/lib/problems';

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
                examples: problem.examples,
                testCaseCount: problem.testCases.length, // Only return count, NOT actual test cases
                note: problem.note || null,
            }
        });
    } catch (error) {
        console.error('Error fetching problem details:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
