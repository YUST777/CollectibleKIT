import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getProblem } from '@/lib/problems';
import { query } from '@/lib/db';

// Self-hosted Judge0 Configuration
const JUDGE0_API_URL = process.env.JUDGE0_API_URL;

// C++ Language ID in Judge0
const CPP_LANGUAGE_ID = 54; // C++ (GCC 9.2.0)

interface SubmitRequest {
    sheetId: string;
    problemId: string;
    sourceCode: string;
    tabSwitches?: number;
    pasteEvents?: number;
    timeToSolve?: number;
}

// Helper Comparison Function (Codeforces Style)
function compareOutputs(expected: string, actual: string): boolean {
    if (!expected && !actual) return true;
    if (!expected || !actual) return false;

    // Normalize: split by whitespace to handle different spacing/newlines
    const tokensExp = expected.trim().split(/\s+/);
    const tokensAct = actual.trim().split(/\s+/);

    if (tokensExp.length !== tokensAct.length) return false;

    for (let i = 0; i < tokensExp.length; i++) {
        const tExp = tokensExp[i];
        const tAct = tokensAct[i];

        // 1. Direct string match (Case-Insensitive)
        if (tExp.toLowerCase() === tAct.toLowerCase()) continue;

        // 2. BigInt comparison (Found logical error: precision loss for > 2^53)
        try {
            // Only attempt if they look like integers (BigInt throws on decimals)
            // This prevents 1.0 == 1 handling here (falls through to float check which is correct for that)
            const biExp = BigInt(tExp);
            const biAct = BigInt(tAct);

            // If both parse as BigInt successfully, compare them perfectly
            if (biExp === biAct) continue;

            // If they are valid distinct integers, they are different!
            // Do NOT fall back to float, or we lose precision.
            // Exception: If one is 1e20 (scientific), BigInt constructor throws, so we go to float.
            return false;
        } catch {
            // Not valid integers (decimals, scientific notation, or garbage)
            // Fallthrough to float comparison
        }

        // 3. Numeric comparison with Epsilon
        const fExp = parseFloat(tExp);
        const fAct = parseFloat(tAct);

        // Check if both are valid numbers
        if (!isNaN(fExp) && !isNaN(fAct)) {
            // Calculate absolute error
            const diff = Math.abs(fExp - fAct);

            // Allow error up to 1e-5 (standard competitive programming tolerance)
            if (diff < 1e-5) {
                continue;
            }
        }

        // If neither matched, fail
        return false;
    }
    return true;
}

export async function POST(req: NextRequest) {
    try {
        // Verify authentication
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { sheetId, problemId, sourceCode, tabSwitches = 0, pasteEvents = 0, timeToSolve }: SubmitRequest = await req.json();

        // Validate input
        if (!sheetId || !problemId || !sourceCode) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!JUDGE0_API_URL) {
            console.error('JUDGE0_API_URL not configured');
            return NextResponse.json({ error: 'Judge service not configured' }, { status: 503 });
        }

        // Get problem data
        const problem = getProblem(sheetId, problemId);
        if (!problem) {
            return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
        }

        if (problem.title === 'Coming Soon') {
            return NextResponse.json({ error: 'This problem is not available yet' }, { status: 400 });
        }

        // Get IP address
        const forwarded = req.headers.get('x-forwarded-for');
        const ipAddress = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';

        // Rate Limiting - Check last submission time (any problem)
        const latestSubmissionResult = await query(
            `SELECT submitted_at
             FROM training_submissions 
             WHERE user_id = $1 
             ORDER BY submitted_at DESC 
             LIMIT 1`,
            [user.id]
        );

        if (latestSubmissionResult.rows.length > 0) {
            const lastSub = latestSubmissionResult.rows[0];
            const lastTime = new Date(lastSub.submitted_at).getTime();
            const now = Date.now();

            // Global Rate Limit (3 seconds)
            if (now - lastTime < 3000) {
                const waitSeconds = Math.ceil((3000 - (now - lastTime)) / 1000);
                return NextResponse.json(
                    { error: `Please wait ${waitSeconds}s before submitting again` },
                    { status: 429 }
                );
            }
        }

        // Duplicate Check - Check ALL previous submissions for this specific problem
        // Uses MD5 hash for efficient comparison (like Codeforces)
        const normalizedCode = sourceCode.trim();
        const duplicateCheck = await query(
            `SELECT id FROM training_submissions 
             WHERE user_id = $1 
               AND sheet_id = $2 
               AND problem_id = $3 
               AND MD5(TRIM(source_code)) = MD5($4)
             LIMIT 1`,
            [user.id, sheetId, problemId, normalizedCode]
        );

        if (duplicateCheck.rows.length > 0) {
            return NextResponse.json(
                { error: 'You have already submitted this exact code for this problem' },
                { status: 400 }
            );
        }

        // Get attempt number for this user/problem
        const attemptResult = await query(
            `SELECT COUNT(*) as count FROM training_submissions 
             WHERE user_id = $1 AND sheet_id = $2 AND problem_id = $3`,
            [user.id, sheetId, problemId]
        );
        const attemptNumber = parseInt(attemptResult.rows[0]?.count || '0') + 1;

        // Fetch test cases from Database (Migrated from file)
        const testCasesResult = await query(
            `SELECT input, expected_output as "expectedOutput" FROM problem_test_cases 
             WHERE sheet_id = $1 AND problem_id = $2 
             ORDER BY is_sample DESC, ordinal ASC`,
            [sheetId, problemId]
        );
        const testCases = testCasesResult.rows;

        // Fallback to file if DB empty (during transition) or if problem not in DB yet
        if (testCases.length === 0 && problem.testCases) {
            console.warn(`[Judge] Using fallback file test cases for ${sheetId}-${problemId}`);
            testCases.push(...problem.testCases);
        }

        // ============================================
        // BATCH SUBMISSION TO JUDGE0 (Optimized)
        // ============================================

        // Prepare batch submission payload
        const batchPayload = {
            submissions: testCases.map(tc => ({
                source_code: Buffer.from(sourceCode).toString('base64'),
                language_id: CPP_LANGUAGE_ID,
                stdin: Buffer.from(tc.input).toString('base64'),
                expected_output: Buffer.from(tc.expectedOutput).toString('base64'),
                cpu_time_limit: problem.timeLimit / 1000,
                memory_limit: problem.memoryLimit * 1024,
            }))
        };

        // Submit batch (1 call instead of N)
        const batchResponse = await fetch(`${JUDGE0_API_URL}/submissions/batch?base64_encoded=true`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batchPayload),
        });

        if (!batchResponse.ok) {
            const errorText = await batchResponse.text();
            console.error('Judge0 Batch API error:', errorText);
            return NextResponse.json({
                error: 'Judge service temporarily unavailable',
                details: process.env.NODE_ENV === 'development' ? errorText : undefined
            }, { status: 503 });
        }

        const batchTokens = await batchResponse.json();

        // Check for partial submission errors (individual test errors)
        const validTokens = batchTokens.filter((t: any) => t.token);
        if (validTokens.length === 0) {
            console.error('Judge0 Batch: No valid submissions returned', batchTokens);
            return NextResponse.json({
                error: 'Failed to submit code for judging',
            }, { status: 500 });
        }

        // Poll for results (wait for all to complete)
        const tokenString = validTokens.map((t: any) => t.token).join(',');
        let submissions: any[] = [];
        let pollAttempts = 0;
        const maxPollAttempts = 30; // 30 seconds max

        while (pollAttempts < maxPollAttempts) {
            await new Promise(r => setTimeout(r, 1000)); // 1 second delay
            pollAttempts++;

            const resultsResponse = await fetch(
                `${JUDGE0_API_URL}/submissions/batch?tokens=${tokenString}&base64_encoded=true&fields=token,stdout,stderr,status_id,time,memory,compile_output`,
                { headers: { 'Content-Type': 'application/json' } }
            );

            if (!resultsResponse.ok) {
                console.error('Judge0 poll error:', await resultsResponse.text());
                continue;
            }

            const pollData = await resultsResponse.json();
            submissions = pollData.submissions || [];

            // Check if all completed (status_id >= 3 means finished)
            const allDone = submissions.every((s: any) => s.status_id >= 3);
            if (allDone) break;
        }

        // Process results
        const results = [];
        let allPassed = true;
        let totalTimeMs = 0;
        let maxMemoryKb = 0;

        for (let i = 0; i < submissions.length; i++) {
            const result = submissions[i];
            const testCase = testCases[i];

            // Decode outputs
            const stdout = result.stdout ? Buffer.from(result.stdout, 'base64').toString('utf-8').trim() : '';
            const stderr = result.stderr ? Buffer.from(result.stderr, 'base64').toString('utf-8') : '';
            const compileOutput = result.compile_output ? Buffer.from(result.compile_output, 'base64').toString('utf-8') : '';

            // Track time and memory
            if (result.time) totalTimeMs += parseFloat(result.time) * 1000;
            if (result.memory && result.memory > maxMemoryKb) maxMemoryKb = result.memory;

            // Determine verdict based on status
            let verdict: string;
            let passed = false;

            switch (result.status_id) {
                case 3: // Accepted
                    if (compareOutputs(testCase.expectedOutput, stdout)) {
                        verdict = 'Accepted';
                        passed = true;
                    } else {
                        verdict = 'Wrong Answer';
                        allPassed = false;
                    }
                    break;
                case 4:
                    verdict = 'Wrong Answer';
                    allPassed = false;
                    break;
                case 5:
                    verdict = 'Time Limit Exceeded';
                    allPassed = false;
                    break;
                case 6:
                    verdict = 'Compilation Error';
                    allPassed = false;
                    break;
                case 7:
                case 8:
                case 9:
                case 10:
                case 11:
                case 12:
                    verdict = 'Runtime Error';
                    allPassed = false;
                    break;
                case 13:
                    verdict = 'Internal Error';
                    allPassed = false;
                    break;
                default:
                    verdict = 'Unknown';
                    allPassed = false;
            }

            results.push({
                testCase: i + 1,
                verdict,
                passed,
                time: result.time ? `${result.time}s` : null,
                memory: result.memory ? `${Math.round(result.memory / 1024)}MB` : null,
                output: stdout,
                ...(verdict === 'Compilation Error' && { compileError: compileOutput }),
                ...(verdict === 'Runtime Error' && { runtimeError: stderr }),
            });

            // For "stop on first failure" behavior, we still track but don't break
            // since we already submitted all tests. Just mark allPassed = false.
        }

        // Final verdict
        const finalVerdict = allPassed ? 'Accepted' : results[results.length - 1]?.verdict || 'Unknown';
        const passedCount = results.filter(r => r.passed).length;

        // Get compile/runtime errors for storage
        const compileError = results.find(r => r.compileError)?.compileError || null;
        const runtimeError = results.find(r => r.runtimeError)?.runtimeError || null;

        // ============================================
        // CHEATING DETECTION (Shadow Ban System)
        // ============================================
        if (finalVerdict === 'Accepted') {
            try {
                // Get user's last accepted submission for a DIFFERENT problem
                const lastAcceptedResult = await query(
                    `SELECT submitted_at, problem_id 
                     FROM training_submissions 
                     WHERE user_id = $1 AND verdict = 'Accepted' AND problem_id != $2
                     ORDER BY submitted_at DESC 
                     LIMIT 1`,
                    [user.id, problemId]
                );

                let isSuspicious = false;

                // Check 1: Time gap between problems
                if (lastAcceptedResult.rows.length > 0) {
                    const lastTime = new Date(lastAcceptedResult.rows[0].submitted_at).getTime();
                    const now = Date.now();
                    const gapSeconds = (now - lastTime) / 1000;

                    if (gapSeconds < 45) {
                        isSuspicious = true;
                        console.log(`⚠️ CHEAT DETECTION: User ${user.id} solved ${problemId} only ${gapSeconds}s after previous problem`);
                    }
                }

                // Check 2: Impossibly fast solve time (handles timeToSolve === 0 bypass)
                if (typeof timeToSolve === 'number' && timeToSolve < 20) {
                    isSuspicious = true;
                    console.log(`⚠️ CHEAT DETECTION: User ${user.id} solved ${problemId} in only ${timeToSolve}s`);
                }

                // If suspicious, increment flags and check for shadow ban threshold
                if (isSuspicious) {
                    const updateResult = await query(
                        `UPDATE users 
                         SET cheating_flags = COALESCE(cheating_flags, 0) + 1 
                         WHERE id = $1 
                         RETURNING cheating_flags`,
                        [user.id]
                    );

                    const newFlagCount = updateResult.rows[0]?.cheating_flags || 0;
                    console.log(`⚠️ CHEAT DETECTION: User ${user.id} now has ${newFlagCount} flags`);

                    // Auto shadow ban after 5 flags (more lenient for first few easy problems)
                    if (newFlagCount >= 5) {
                        await query(
                            `UPDATE users SET is_shadow_banned = TRUE WHERE id = $1`,
                            [user.id]
                        );
                        console.log(`🚫 SHADOW BAN: User ${user.id} has been shadow banned (${newFlagCount} flags)`);
                    }
                }
            } catch (cheatDetectError) {
                // Don't fail the submission if cheat detection fails
                console.error('Cheat detection error:', cheatDetectError);
            }
        }

        // Save submission to database
        try {
            const insertResult = await query(
                `INSERT INTO training_submissions (
                    user_id, sheet_id, problem_id, source_code, verdict,
                    time_ms, memory_kb, test_cases_passed, total_test_cases,
                    compile_error, runtime_error, ip_address,
                    tab_switches, paste_events, time_to_solve_seconds, attempt_number
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING id`,
                [
                    user.id,
                    sheetId,
                    problemId,
                    sourceCode,
                    finalVerdict,
                    Math.round(totalTimeMs),
                    maxMemoryKb,
                    passedCount,
                    testCases.length,
                    compileError,
                    runtimeError,
                    ipAddress,
                    tabSwitches,
                    pasteEvents,
                    timeToSolve || null,
                    attemptNumber
                ]
            );

            const submissionId = insertResult.rows[0]?.id;

            return NextResponse.json({
                success: true,
                submissionId,
                verdict: finalVerdict,
                passed: allPassed,
                testsPassed: passedCount,
                totalTests: testCases.length,
                time: `${Math.round(totalTimeMs)}ms`,
                memory: `${Math.round(maxMemoryKb)}KB`,
                attemptNumber,
                results,
                problem: {
                    id: problemId,
                    title: problem.title,
                }
            });

        } catch (dbError) {
            console.error('Database error saving submission:', dbError);
            // Still return the verdict even if DB save fails
            return NextResponse.json({
                success: true,
                verdict: finalVerdict,
                passed: allPassed,
                testsPassed: passedCount,
                totalTests: testCases.length,
                results,
                warning: 'Submission not saved to history',
                problem: {
                    id: problemId,
                    title: problem.title,
                }
            });
        }

    } catch (error) {
        console.error('Error in judge submission:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
