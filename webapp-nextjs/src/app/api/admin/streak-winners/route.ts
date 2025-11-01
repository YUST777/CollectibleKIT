import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getUserFromTelegram } from '@/lib/telegram';

// GET: Get all users who completed 15-day streak
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (you can add admin check logic here)
    // For now, we'll allow any authenticated user to see winners
    // In production, you might want to restrict this to specific admin users
    
    console.log(`👑 Getting streak winners for admin ${user.id}`);
    
    const winners = await db.getStreakWinners();
    
    return NextResponse.json({
      success: true,
      winners: winners.map(winner => ({
        userId: winner.user_id,
        firstName: winner.first_name,
        username: winner.username,
        streakDays: winner.streak_days,
        lastStreakClick: winner.last_streak_click,
        completedAt: winner.last_streak_click
      })),
      totalWinners: winners.length
    });
  } catch (error) {
    console.error('Error getting streak winners:', error);
    return NextResponse.json({ 
      error: 'Failed to get streak winners', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}
