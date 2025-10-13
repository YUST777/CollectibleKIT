import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/userService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdStr = searchParams.get('user_id');

    if (!userIdStr) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const userId = parseInt(userIdStr);
    if (isNaN(userId) || userId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    console.log('🔍 Getting user info for:', userId);

    const userInfo = await UserService.getUserInfo(userId);

    if (!userInfo) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('✅ User info retrieved:', userInfo);

    return NextResponse.json({
      success: true,
      user: userInfo
    });

  } catch (error) {
    console.error('❌ Get user info error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}


