import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { db } from '@/lib/database';

/**
 * Get portfolio fetch status
 * Used by frontend to poll for updates
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

    const cachedData = await db.getAutoGiftsCache(user.id);
    const isFetching = await db.isPortfolioFetching(user.id);
    const cacheAge = cachedData ? Date.now() - cachedData.cachedAt : Infinity;

    return NextResponse.json({
      success: true,
      is_fetching: isFetching,
      has_cache: !!cachedData,
      cache_age_seconds: cachedData ? Math.round(cacheAge / 1000) : null,
      cached_at: cachedData?.cachedAt || null
    });
  } catch (error) {
    console.error('❌ Portfolio status error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

