import { NextRequest } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { db } from '@/lib/database';
import { successResponse, ApiErrors, handleApiError } from '@/lib/api-response';

/**
 * Get profit/loss data for user's portfolio
 * Returns daily, weekly, monthly changes and all-time high/low
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      return ApiErrors.unauthorized();
    }

    const profitLoss = await db.getProfitLoss(user.id);

    return successResponse({ profit_loss: profitLoss });

  } catch (error) {
    return handleApiError(error, 'Failed to fetch profit/loss data');
  }
}

