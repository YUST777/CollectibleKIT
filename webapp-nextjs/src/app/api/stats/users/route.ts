import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Get total unique users from database
    const totalUsers = await db.getTotalUsers();
    
    // Get active users (users who have been active in the last 24 hours)
    const activeUsers = await db.getActiveUsers();
    
    // Get today's new users
    const newUsersToday = await db.getNewUsersToday();
    
    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        newUsersToday,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error getting user stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
