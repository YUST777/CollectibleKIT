import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { db } from '@/lib/database';
import { spawn } from 'child_process';

/**
 * Preload portfolio in background when user opens website
 * Called automatically, doesn't block user
 * Returns immediately with cached data if available
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      // Not authenticated, but don't error (might be public page)
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if we have cached data
    const cachedData = await db.getAutoGiftsCache(user.id);
    
    // Start background fetch if cache is stale (> 5 minutes) or missing
    const cacheAge = cachedData ? Date.now() - cachedData.cachedAt : Infinity;
    const cacheMaxAge = 5 * 60 * 1000; // 5 minutes
    
    if (!cachedData || cacheAge >= cacheMaxAge) {
      // Trigger background fetch (non-blocking)
      triggerBackgroundPortfolioFetch(user.id, user.username || user.id.toString()).catch(err => {
        console.error('Background preload error:', err);
      });
    }

    // Return cached data immediately (even if stale) or empty
    if (cachedData) {
      return NextResponse.json({
        success: true,
        gifts: cachedData.gifts,
        total_value: cachedData.totalValue,
        cached: true,
        stale: cacheAge >= cacheMaxAge,
        preloading: !cachedData || cacheAge >= cacheMaxAge
      });
    }

    // No cache, return empty (background fetch will populate)
    return NextResponse.json({
      success: true,
      gifts: [],
      total_value: 0,
      cached: false,
      preloading: true
    });

  } catch (error) {
    console.error('❌ Portfolio preload error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// Background fetch function (non-blocking)
async function triggerBackgroundPortfolioFetch(userId: number, userIdentifier: string): Promise<void> {
  try {
    await db.setPortfolioFetching(userId, true);
    
    const projectRoot = '/root/01studio/CollectibleKIT';
    const pythonScript = `${projectRoot}/bot/services/get_profile_gifts.py`;
    const venvPython = '/usr/bin/python3';
    const args = [pythonScript, userIdentifier];
    
    // Run in background (don't wait for result)
    const python = spawn(venvPython, args, {
      cwd: projectRoot,
      detached: true,
      stdio: 'ignore'
    });
    
    python.unref(); // Allow process to exit independently
    
  } catch (error) {
    console.error('Error triggering background preload:', error);
    await db.setPortfolioFetching(userId, false);
  }
}

