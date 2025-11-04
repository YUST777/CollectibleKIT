import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { db } from '@/lib/database';

/**
 * Get all tasks for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all active tasks
    const tasks = await db.getTasks();
    
    // Get completion status for each task
    const tasksWithStatus = await Promise.all(
      tasks.map(async (task) => {
        const completionStatus = await db.getTaskCompletionStatus(user.id, task.task_id);
        return {
          ...task,
          completed: completionStatus.completed,
          completedAt: completionStatus.completedAt,
          creditsEarned: completionStatus.creditsEarned
        };
      })
    );

    return NextResponse.json({
      success: true,
      tasks: tasksWithStatus
    });

  } catch (error) {
    console.error('❌ Tasks GET error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
