import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Fetching user statistics');

    // Get total users count
    const totalUsers = await db.getTotalUsersCount();
    
    // Get active users (users who have been active in the last 24 hours)
    const activeUsers = await db.getActiveUsersCount();
    
    // Get new users today
    const newUsersToday = await db.getNewUsersTodayCount();

    const stats = {
      totalUsers,
      activeUsers,
      newUsersToday,
      timestamp: new Date().toISOString()
    };

    console.log('✅ User stats retrieved:', stats);

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Error fetching user stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch user stats' 
      },
      { status: 500 }
    );
  }
}
