import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getUserFromTelegram } from '@/lib/telegram';

// POST: Check if a task is completed
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId, userId } = await request.json();
    if (!taskId) {
      return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
    }

    const userIdToCheck = userId || user?.id;
    console.log(`🔍 Checking task completion: ${taskId} for user ${userIdToCheck}`);

    let completed = false;
    let message = '';

    switch (taskId) {
      case 'daily_create_story':
        // Check if user has processed any images today
        const today = new Date().toISOString().split('T')[0];
        const todayStart = new Date(today).getTime();
        const todayEnd = todayStart + (24 * 60 * 60 * 1000);
        
        const storyRequests = await db.getUserRequests(userIdToCheck, todayStart, todayEnd);
        completed = storyRequests.length > 0;
        message = completed ? 'Story created successfully!' : 'Please create and share a story first.';
        break;

      case 'daily_play_games':
        // Check if user completed both daily games today
        completed = await db.hasUserCompletedBothDailyGamesToday(userIdToCheck);
        message = completed ? 'Both daily games completed!' : 'Please complete both morning and afternoon daily games.';
        break;

      case 'daily_public_collection':
        // Check if user created any public collection today
        const todayStart2 = new Date().toISOString().split('T')[0];
        const todayStartTime = new Date(todayStart2).getTime();
        const todayEndTime = todayStartTime + (24 * 60 * 60 * 1000);
        
        const userCollections = await db.getUserCollections(userIdToCheck);
        const todayPublicCollections = userCollections.filter(collection => {
          const createdAt = new Date(collection.created_at).getTime();
          return createdAt >= todayStartTime && createdAt < todayEndTime && collection.is_public;
        });
        
        completed = todayPublicCollections.length > 0;
        message = completed ? 'Public collection created!' : 'Please create and make a collection public today.';
        break;

      case 'daily_promote_canvas':
        // For now, we'll consider this completed if user clicked the share button
        // In a real implementation, you might track story shares or referral clicks
        completed = true; // This is a simple implementation - you could track actual shares
        message = 'Story promotion completed!';
        break;

      case 'special_invite_5':
      case 'special_invite_10':
      case 'special_invite_25':
      case 'special_invite_50':
        // Check referral count
        const targetCount = parseInt(taskId.split('_')[2]);
        const stats = await db.getReferralStats(userIdToCheck);
        completed = stats.totalReferrals >= targetCount;
        message = completed 
          ? `You have invited ${stats.totalReferrals} friends!` 
          : `You need to invite ${targetCount} friends. Currently: ${stats.totalReferrals}/${targetCount}`;
        break;

      default:
        return NextResponse.json({ error: 'Unknown task' }, { status: 400 });
    }

    console.log(`✅ Task check result: ${taskId} - ${completed ? 'Completed' : 'Not completed'}`);
    
    return NextResponse.json({
      completed,
      message,
      taskId
    });

  } catch (error) {
    console.error('Error checking task completion:', error);
    return NextResponse.json({ 
      error: 'Failed to check task completion', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}

