import { NextRequest, NextResponse } from 'next/server';
import { DailyGameService } from '@/lib/dailyGameService';

export async function GET(request: NextRequest) {
  try {
    console.log('🎮 Getting daily game question');

    // Get userId from query params (optional for testing)
    const url = new URL(request.url);
    const userIdParam = url.searchParams.get('userId');
    const userId = userIdParam ? parseInt(userIdParam) : undefined;

    console.log('📥 Request params:', {
      userId,
      userIdParam,
      fullUrl: request.url
    });

    const question = await DailyGameService.getTodaysQuestion(userId);

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