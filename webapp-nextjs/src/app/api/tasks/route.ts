import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getUserFromTelegram } from '@/lib/telegram';

// GET: Get all tasks with completion status
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`📋 Getting tasks for user ${user?.id}`);
    
    // Get all tasks
    const tasks = await db.getTasks();
    
    // Get completion status for each task
    const tasksWithStatus = await Promise.all(
      tasks.map(async (task) => {
        const status = await db.getTaskCompletionStatus(user?.id || 0, task.task_id);
        
        // For special tasks (invite tasks), check actual progress
        let progress = 0;
        let canComplete = false;
        
        if (task.task_id.startsWith('special_invite_')) {
          const stats = await db.getReferralStats(user?.id || 0);
          const targetCount = parseInt(task.task_id.split('_')[2]);
          
          progress = Math.min(stats.totalReferrals, targetCount);
          canComplete = stats.totalReferrals >= targetCount && !status.completed;
        } else if (task.task_id === 'special_15day_login') {
          // For 15-day login task, check if streak is completed
          const userData = await db.getUser(user?.id || 0);
          progress = Math.min(userData?.streak_days || 0, 15);
          canComplete = (userData?.streak_completed === true) && !status.completed;
        } else {
          // For daily tasks, check if they can be completed based on actual actions
          canComplete = !status.completed;
        }
        
        return {
          ...task,
          completed: status.completed,
          completedAt: status.completedAt,
          creditsEarned: status.creditsEarned,
          progress,
          canComplete
        };
      })
    );

    console.log(`✅ Found ${tasksWithStatus.length} tasks for user ${user?.id}`);
    return NextResponse.json({ tasks: tasksWithStatus });
  } catch (error) {
    console.error('Error getting tasks:', error);
    return NextResponse.json({ error: 'Failed to get tasks', details: (error as Error).message }, { status: 500 });
  }
}

