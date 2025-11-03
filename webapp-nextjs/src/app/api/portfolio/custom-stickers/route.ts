import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { db } from '@/lib/database';

/**
 * Get custom portfolio stickers for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const customStickers = await db.getCustomStickers(user.id);
    
    return NextResponse.json({
      success: true,
      stickers: customStickers
    });

  } catch (error) {
    console.error('❌ Custom stickers GET error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * Add a custom sticker to the portfolio
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const stickerData = body.sticker;

    if (!stickerData) {
      return NextResponse.json(
        { success: false, error: 'Sticker data required' },
        { status: 400 }
      );
    }

    console.log('💾 Adding custom sticker:', {
      collection: stickerData.collection,
      character: stickerData.character,
      init_price: stickerData.init_price_usd,
      current_price: stickerData.current_price_usd
    });

    const success = await db.addCustomSticker(user.id, stickerData);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Custom sticker added successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to add custom sticker' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Custom stickers POST error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * Delete a custom sticker from the portfolio
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const stickerId = searchParams.get('id');

    if (!stickerId) {
      return NextResponse.json(
        { success: false, error: 'Sticker ID required' },
        { status: 400 }
      );
    }

    const success = await db.deleteCustomSticker(user.id, parseInt(stickerId));

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Custom sticker deleted successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to delete custom sticker' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Custom stickers DELETE error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

