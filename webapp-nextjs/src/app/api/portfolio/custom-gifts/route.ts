import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { db } from '@/lib/database';

/**
 * Get custom portfolio gifts for the authenticated user
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

    const customGifts = await db.getCustomGifts(user.id);
    
    return NextResponse.json({
      success: true,
      gifts: customGifts
    });

  } catch (error) {
    console.error('❌ Custom gifts GET error:', error);
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
 * Add a custom gift to the portfolio
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
    const giftData = body.gift;

    if (!giftData) {
      return NextResponse.json(
        { success: false, error: 'Gift data required' },
        { status: 400 }
      );
    }

    console.log('💾 Adding custom gift:', {
      slug: giftData.slug,
      num: giftData.num,
      model_name: giftData.model_name,
      backdrop_name: giftData.backdrop_name,
      price: giftData.price
    });

    const success = await db.addCustomGift(user.id, giftData);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Custom gift added successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to add custom gift' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Custom gifts POST error:', error);
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
 * Delete a custom gift from the portfolio
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
    const giftId = searchParams.get('id');

    if (!giftId) {
      return NextResponse.json(
        { success: false, error: 'Gift ID required' },
        { status: 400 }
      );
    }

    const success = await db.deleteCustomGift(user.id, parseInt(giftId));

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Custom gift deleted successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to delete custom gift' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Custom gifts DELETE error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

