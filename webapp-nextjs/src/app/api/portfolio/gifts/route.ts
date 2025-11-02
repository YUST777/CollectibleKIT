import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Portfolio gifts API called');
    
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('📊 Getting portfolio for user:', user.id);
    
    // For now, return empty array - this should be integrated with the Python bot
    // to fetch actual gifts from the user's Telegram Star profile
    const gifts = [];
    const totalValue = 0;

    return NextResponse.json({
      success: true,
      gifts,
      total_value: totalValue
    });

  } catch (error) {
    console.error('❌ Portfolio gifts error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

