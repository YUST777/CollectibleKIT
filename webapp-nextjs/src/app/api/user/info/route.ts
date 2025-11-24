import { NextRequest } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { db } from '@/lib/database';
import { successResponse, ApiErrors, handleApiError } from '@/lib/api-response';

/**
 * Get user information
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      return ApiErrors.unauthorized();
    }

    const userData = await db.getUser(user.id);
    if (!userData) {
      return ApiErrors.notFound('User');
    }

    return successResponse({
      user: {
        id: userData.user_id,
        username: userData.username,
        first_name: userData.first_name,
        last_name: userData.last_name,
        credits: userData.credits,
        free_uses: userData.free_uses,
        user_type: userData.user_type,
        premium_expires_at: userData.premium_expires_at,
        streak_days: userData.streak_days,
        streak_completed: userData.streak_completed
      }
    });

  } catch (error) {
    return handleApiError(error, 'Failed to fetch user information');
  }
}
