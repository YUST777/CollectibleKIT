import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getUserFromTelegram } from '@/lib/telegram';

// GET: Get all tasks with completion status
export async function GET(request: NextRequest) {
  try {
    // Try to get user from Telegram WebApp data
    let userId: number | null = null;
    
    try {
      const user = await getUserFromTelegram(request);
      if (user) {
        userId = user.id;
        console.log(`📋 Getting tasks for user ${userId}`);
      }
    } catch (error) {
      console.log('Could not get user from Telegram WebApp, continuing without user');
    }

    // Get all tasks
    const tasks = await db.getTasks();
    
    // Get completion status for each task
    const tasksWithStatus = await Promise.all(
      tasks.map(async (task) => {
        let completed = false;
        let completedAt: number | undefined;
        let creditsEarned: number | undefined;
        let progress = 0;
        let canComplete = false;
        
        if (userId) {
          const status = await db.getTaskCompletionStatus(userId, task.task_id);
          completed = status.completed;
          completedAt = status.completedAt;
          creditsEarned = status.creditsEarned;
          
          // For special tasks (invite tasks), check actual progress
          if (task.task_id.startsWith('special_invite_')) {
            const stats = await db.getReferralStats(userId);
            const targetCount = parseInt(task.task_id.split('_')[2]);
            
            progress = Math.min(stats.totalReferrals, targetCount);
            canComplete = stats.totalReferrals >= targetCount && !completed;
          } else if (task.task_id === 'special_15day_login') {
            // For 15-day login task, check if streak is completed
            const userData = await db.getUser(userId);
            progress = Math.min(userData?.streak_days || 0, 15);
            canComplete = (userData?.streak_completed === true) && !completed;
          } else {
            // For daily tasks, check if they can be completed based on actual actions
            canComplete = !completed;
          }
        }
        
        return {
          ...task,
          completed,
          completedAt,
          creditsEarned,
          progress,
          canComplete
        };
      })
    );

    console.log(`✅ Found ${tasksWithStatus.length} tasks`);
    return NextResponse.json({ tasks: tasksWithStatus });
  } catch (error) {
    console.error('Error getting tasks:', error);
    return NextResponse.json({ error: 'Failed to get tasks', details: (error as Error).message }, { status: 500 });
  }
}
