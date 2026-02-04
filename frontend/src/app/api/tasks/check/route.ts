import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { db } from '@/lib/database';

/**
 * Check if a task has been completed
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

    // Get task details
    const task = await db.getTasks().then(tasks => tasks.find(t => t.task_id === taskId));
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Get completion status
    const completionStatus = await db.getTaskCompletionStatus(user.id, taskId);

    // For certain tasks, we might need to check external conditions
    // For now, just return the database status
    return NextResponse.json({
      success: true,
      completed: completionStatus.completed,
      message: completionStatus.completed 
        ? 'Task completed! You can claim your reward.' 
        : 'Task not completed yet. Please complete the required actions.'
    });

  } catch (error) {
    console.error('❌ Tasks check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
