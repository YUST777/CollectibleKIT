import { NextRequest, NextResponse } from 'next/server';
import { emojiGameService } from '@/lib/emojiGameService';

export async function GET(request: NextRequest) {
  try {
    console.log('🎨 Getting models for gift');

    // Get gift name from query params
    const url = new URL(request.url);
    const giftName = url.searchParams.get('gift');

    if (!giftName) {
      return NextResponse.json({
        success: false,
        error: 'Gift name is required'
      }, { status: 400 });
    }

    const models = await emojiGameService.getModelsForGift(giftName);

    console.log(`✅ Retrieved ${models.length} models for ${giftName}`);

    return NextResponse.json({
      success: true,
      models: models
    });

  } catch (error) {
    console.error('❌ Get models error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

