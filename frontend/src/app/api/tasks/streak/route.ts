import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { db } from '@/lib/database';

/**
 * Get streak status for the authenticated user
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

    const today = new Date().toISOString().split('T')[0];
    const canCheckIn = userData.last_streak_click !== today;

    return NextResponse.json({
      success: true,
      streakDays: userData.streak_days || 0,
      canCheckIn: canCheckIn,
      streakCompleted: !!userData.streak_completed,
      lastStreakClick: userData.last_streak_click
    });

  } catch (error) {
    console.error('❌ Streak GET error:', error);
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
 * Check in for streak
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

    const result = await db.updateStreak(user.id);

    if (result.success) {
      return NextResponse.json({
        success: true,
        streakDays: result.streakDays,
        message: result.message
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: result.message 
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Streak POST error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
