import { NextRequest, NextResponse } from 'next/server';
import { emojiGameService } from '@/lib/emojiGameService';

export async function GET(request: NextRequest) {
  try {
    console.log('🎁 Getting all gifts from emoji database');

    const gifts = await emojiGameService.getAllGifts();

    console.log(`✅ Retrieved ${gifts.length} gifts`);

    return NextResponse.json({
      success: true,
      gifts: gifts
    });

  } catch (error) {
    console.error('❌ Get gifts error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

