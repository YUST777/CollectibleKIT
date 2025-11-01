import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Sticker portfolio API called');
    
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('📊 Getting sticker portfolio for user:', user.id);
    
    // For now, return empty data - should be integrated with sticker tracking
    const stickers: any[] = [];
    const portfolio_value = {
      collections: [],
      total_init: 0,
      total_current: 0,
      total_pnl: 0
    };

    return NextResponse.json({
      success: true,
      stickers,
      portfolio_value,
      profile: {
        user: {
          id: user.id.toString(),
          name: user.first_name || 'Unknown'
        },
        total_nfts: 0,
        total_stickers: 0
      }
    });

  } catch (error) {
    console.error('❌ Sticker portfolio error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

