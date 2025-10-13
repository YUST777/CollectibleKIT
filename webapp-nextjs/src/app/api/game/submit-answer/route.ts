import { NextRequest, NextResponse } from 'next/server';
import { DailyGameService } from '@/lib/dailyGameService';

export async function POST(request: NextRequest) {
  try {
    console.log('🎮 Submitting daily game answer');

    const body = await request.json();
    const { userId, answer } = body;

    // Validate required fields
    if (!userId || !answer) {
      return NextResponse.json(
        { success: false, error: 'Missing userId or answer' },
        { status: 400 }
      );
    }

    // Validate userId
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum) || userIdNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    console.log('Answer submission:', {
      userId: userIdNum,
      answer: answer
    });

    // Submit answer
    const result = await DailyGameService.submitAnswer(userIdNum, answer);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to submit answer'
      }, { status: 400 });
    }

    console.log('✅ Answer submitted:', {
      correct: result.correct,
      isFirstSolver: result.is_first_solver,
      reward: result.reward
    });

    return NextResponse.json({
      success: true,
      correct: result.correct,
      is_first_solver: result.is_first_solver,
      reward: result.reward,
      correct_answer: result.correct_answer
    });

  } catch (error) {
    console.error('❌ Submit answer error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}