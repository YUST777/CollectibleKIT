import { NextRequest, NextResponse } from 'next/server';
import { DailyGameService } from '@/lib/dailyGameService';

export async function POST(request: NextRequest) {
  try {
    console.log('🎮 Submitting daily game answer');

    const body = await request.json();
    const { userId, answer } = body;

    console.log('📥 Received submission:', {
      userId,
      answer,
      bodyKeys: Object.keys(body)
    });

    // Validate required fields
    if (!answer) {
      return NextResponse.json(
        { success: false, error: 'Missing answer' },
        { status: 400 }
      );
    }

    // Validate userId if provided
    let userIdNum = 0; // Default for anonymous
    if (userId) {
      userIdNum = parseInt(userId);
      if (isNaN(userIdNum) || userIdNum < 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid user ID' },
          { status: 400 }
        );
      }
    }

    console.log('✅ Answer submission validated:', {
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