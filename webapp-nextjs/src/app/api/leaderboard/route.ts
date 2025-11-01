import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getUserFromTelegram } from '@/lib/telegram';

// GET: Get leaderboard with top users by credits
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`🏆 Getting leaderboard for user ${user.id}`);
    
    // Get top 50 users by credits
    const topUsers = await db.getTopUsersByCredits(50);
    
    // Get current user's rank
    const userRank = await db.getUserRankByCredits(user.id);
    
    return NextResponse.json({
      success: true,
      leaderboard: topUsers,
      userRank: userRank
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return NextResponse.json({ 
      error: 'Failed to get leaderboard', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}
