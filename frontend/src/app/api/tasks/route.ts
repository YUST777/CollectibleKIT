import { NextRequest } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { db } from '@/lib/database';
import { successResponse, ApiErrors, handleApiError } from '@/lib/api-response';

/**
 * Get all tasks for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      return ApiErrors.unauthorized();
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

    return successResponse({ tasks: tasksWithStatus });

  } catch (error) {
    return handleApiError(error, 'Failed to fetch tasks');
  }
}
