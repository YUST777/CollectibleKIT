import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { db } from '@/lib/database';

/**
 * Complete a task and grant credits
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'Task ID required' },
        { status: 400 }
      );
    }

    // Get task details to check credits reward
    const tasks = await db.getTasks();
    const task = tasks.find(t => t.task_id === taskId);
    
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Complete the task
    const success = await db.completeTask(user.id, taskId);

    if (success) {
      return NextResponse.json({
        success: true,
        creditsEarned: task.credits_reward,
        message: `Earned ${task.credits_reward} credits!`
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Task already completed or failed to complete' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Tasks complete error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
