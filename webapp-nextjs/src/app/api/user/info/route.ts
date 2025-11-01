import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getUserFromTelegram } from '@/lib/telegram';

// GET: Get user information including credits and TON balance
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`👤 Getting user info for user ${user.id}`);
    
    const userData = await db.getUser(user.id);
    
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user_id: userData.user_id,
      username: userData.username,
      first_name: userData.first_name,
      user_type: userData.user_type,
      credits: userData.credits || 0,
      ton_balance: userData.ton_balance || 0,
      first_win_claimed: userData.first_win_claimed || false,
      daily_wins_count: userData.daily_wins_count || 0,
      last_win_date: userData.last_win_date,
      streak_days: userData.streak_days || 0,
      streak_completed: userData.streak_completed || false
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    return NextResponse.json({ 
      error: 'Failed to get user info', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}