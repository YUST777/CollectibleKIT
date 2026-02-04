import { NextRequest, NextResponse } from 'next/server';
import { DailyGameService } from '@/lib/dailyGameService';

export async function GET(request: NextRequest) {
  try {
    console.log('🎮 Getting daily game question');

    // Get userId and gameType from query params
    const url = new URL(request.url);
    const userIdParam = url.searchParams.get('userId');
    const gameType = url.searchParams.get('gameType') || 'zoom'; // Default to zoom
    const userId = userIdParam ? parseInt(userIdParam) : undefined;

    console.log('📥 Request params:', {
      userId,
      gameType,
      userIdParam,
      fullUrl: request.url
    });

    // Get question based on game type
    let question;
    if (gameType === 'emoji') {
      question = await DailyGameService.getRandomEmojiQuestion(userId);
    } else {
      question = await DailyGameService.getTodaysQuestion(userId);
    }

    if (!question) {
      return NextResponse.json({
        success: false,
        error: 'No puzzle available for today'
      }, { status: 404 });
    }

    console.log('✅ Daily question retrieved:', {
      id: question.id,
      type: question.game_type,
      timeSlot: question.time_slot,
      solversCount: question.solvers_count
    });

    return NextResponse.json({
      success: true,
      question: question
    });

  } catch (error) {
    console.error('❌ Daily question error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}