import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getUserFromTelegram } from '@/lib/telegram';

// POST: Check in for 15-day streak mission
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`📅 Streak check-in for user ${user.id}`);
    
    const result = await db.updateStreak(user.id);
    
    // Record feed event if streak is completed (15 days)
    if (result.success && result.streakDays === 15) {
      await db.recordFeedEvent(user.id, 'streak_complete', { days: 15 });
    }
    
    return NextResponse.json({
      success: result.success,
      streakDays: result.streakDays,
      message: result.message,
      isCompleted: result.streakDays >= 15
    });
  } catch (error) {
    console.error('Error updating streak:', error);
    return NextResponse.json({ 
      error: 'Failed to update streak', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}

// GET: Get current streak status
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userData = await db.getUser(user.id);
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      streakDays: userData.streak_days || 0,
      lastStreakClick: userData.last_streak_click,
      streakCompleted: userData.streak_completed || false,
      canCheckIn: userData.last_streak_click !== new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Error getting streak status:', error);
    return NextResponse.json({ 
      error: 'Failed to get streak status', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}
