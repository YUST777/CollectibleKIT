import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { db } from '@/lib/database';

/**
 * Get channel gifts for the authenticated user
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

    const channelGifts = await db.getChannelGifts(user.id);
    
    return NextResponse.json({
      success: true,
      gifts: channelGifts
    });

  } catch (error) {
    console.error('❌ Channel gifts GET error:', error);
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
 * Add channel gifts to the portfolio
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
    const channelData = body.channelData;

    if (!channelData) {
      return NextResponse.json(
        { success: false, error: 'Channel data required' },
        { status: 400 }
      );
    }

    console.log('💾 Adding channel gifts:', {
      username: channelData.channel_username,
      total_gifts: channelData.total_gifts,
      total_value: channelData.total_value,
      gifts_sample: channelData.gifts?.[0]
    });

    const success = await db.addChannelGifts(user.id, channelData);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Channel gifts added successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to add channel gifts' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Channel gifts POST error:', error);
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
 * Delete channel gifts from the portfolio
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
        { success: false, error: 'Channel gifts ID required' },
        { status: 400 }
      );
    }

    const success = await db.deleteChannelGifts(user.id, parseInt(giftId));

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Channel gifts deleted successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to delete channel gifts' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Channel gifts DELETE error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

