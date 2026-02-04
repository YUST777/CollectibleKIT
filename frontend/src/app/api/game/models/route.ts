import { NextRequest, NextResponse } from 'next/server';
import { emojiGameService } from '@/lib/emojiGameService';

export async function GET(request: NextRequest) {
  try {
    console.log('🎨 Getting models for gift (emoji game service)');

    // Get gift name from query params
    const url = new URL(request.url);
    const giftName = url.searchParams.get('gift');

    if (!giftName) {
      return NextResponse.json({
        success: true,
        models: []
      });
    }

    try {
      const models = await emojiGameService.getModelsForGift(giftName);

      console.log(`✅ Retrieved ${models.length} models for ${giftName} from emoji game service`);

      return NextResponse.json({
        success: true,
        models: models || []
      });
    } catch (serviceError) {
      console.error(`❌ Emoji game service error for ${giftName}:`, serviceError);
      // Return empty array instead of error to prevent UI crashes
      return NextResponse.json({
        success: true,
        models: []
      });
    }

  } catch (error) {
    console.error('❌ Get models error:', error);
    // Return empty array instead of error to prevent UI crashes
    return NextResponse.json({
      success: true,
      models: [],
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

