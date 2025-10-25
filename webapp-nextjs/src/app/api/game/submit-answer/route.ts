import { NextRequest, NextResponse } from 'next/server';
import { DailyGameService } from '@/lib/dailyGameService';
import { db } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('🎮 Submitting daily game answer');

    const body = await request.json();
    const { userId, answer, gameType } = body;

    console.log('📥 Received submission:', {
      userId,
      answer,
      gameType,
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
      answer: answer,
      gameType: gameType
    });

    // Submit answer with game type
    const result = await DailyGameService.submitAnswer(userIdNum, answer, gameType);

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

    // If answer is correct, record the game win for earning system
    let isFirstWin = false;
    if (result.correct && userIdNum > 0) {
      try {
        // Check if this is the user's first win ever
        const user = await db.getUser(userIdNum);
        isFirstWin = user ? !user.first_win_claimed : false;
        
        // Record the game win
        const winRecorded = await db.recordGameWin(userIdNum, isFirstWin);
        
        if (winRecorded) {
          console.log(`🎉 Game win recorded for user ${userIdNum}${isFirstWin ? ' (first win bonus!)' : ''}`);
        } else {
          console.log(`⚠️ Failed to record game win for user ${userIdNum} (possibly reached daily limit)`);
        }
        
        // ALWAYS record feed event for game win, even if win wasn't recorded to users table
        // This ensures the feed shows all game activity
        console.log(`📝 Recording game win feed event for user ${userIdNum}`);
        await db.recordFeedEvent(userIdNum, 'game_win', { credits: 1 });
        
        // Record feed event for first win bonus if applicable
        if (isFirstWin && winRecorded) {
          await db.recordFeedEvent(userIdNum, 'first_win_bonus', { ton: 0.1 });
        }
      } catch (error) {
        console.error('Error recording game win:', error);
        // Don't fail the request if win recording fails
      }
    }

    return NextResponse.json({
      success: true,
      correct: result.correct,
      is_first_solver: result.is_first_solver,
      reward: result.reward,
      correct_answer: result.correct_answer,
      is_first_win: isFirstWin
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