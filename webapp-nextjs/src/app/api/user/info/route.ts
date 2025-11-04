import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { db } from '@/lib/database';

/**
 * Get user information
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

    const userData = await db.getUser(user.id);
    if (!userData) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userData.user_id,
        username: userData.username,
        first_name: userData.first_name,
        last_name: userData.last_name,
        credits: userData.credits,
        free_uses: userData.free_uses,
        user_type: userData.user_type,
        premium_expires_at: userData.premium_expires_at,
        streak_days: userData.streak_days,
        streak_completed: userData.streak_completed
      }
    });

  } catch (error) {
    console.error('❌ User info error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
