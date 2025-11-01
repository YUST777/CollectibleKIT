import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getUserFromTelegram } from '@/lib/telegram';

// POST: Complete a task
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await request.json();
    if (!taskId) {
      return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
    }

    console.log(`🎯 Completing task ${taskId} for user ${user?.id}`);
    
    // Check if task can be completed
    const task = await db.getTasks().then(tasks => tasks.find(t => t.task_id === taskId));
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // For special invite tasks, verify the user has actually invited enough people
    if (taskId.startsWith('special_invite_')) {
      const stats = await db.getReferralStats(user?.id || 0);
      const targetCount = parseInt(taskId.split('_')[2]);
      
      if (stats.totalReferrals < targetCount) {
        return NextResponse.json({ 
          error: 'Not enough referrals', 
          current: stats.totalReferrals, 
          required: targetCount 
        }, { status: 400 });
      }
    }

    // Complete the task
    const success = await db.completeTask(user?.id || 0, taskId);
    
    if (success) {
      console.log(`✅ Task completed: ${taskId}, earned ${task.credits_reward} credits`);
      
      // Record feed event for task completion
      await db.recordFeedEvent(user?.id || 0, 'task_complete', { 
        taskTitle: task.title,
        credits: task.credits_reward 
      });
      
      return NextResponse.json({ 
        success: true, 
        creditsEarned: task.credits_reward,
        message: `Task completed! Earned ${task.credits_reward} credits.`
      });
    } else {
      return NextResponse.json({ error: 'Task already completed or failed to complete' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error completing task:', error);
    return NextResponse.json({ error: 'Failed to complete task', details: (error as Error).message }, { status: 500 });
  }
}

