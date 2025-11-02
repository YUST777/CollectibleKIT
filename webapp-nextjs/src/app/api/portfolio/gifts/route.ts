import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { spawn } from 'child_process';
import path from 'path';
import { db } from '@/lib/database';

/**
 * Get portfolio gifts for the authenticated user
 * This endpoint fetches the user's saved Telegram Star gifts using Python script
 * Implements rate limiting (1 request per minute) and caching
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Portfolio gifts API called');
    
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('📊 Getting portfolio for user:', user.id);
    
    // Check rate limit (60 seconds = 60000ms)
    const canRefresh = await db.checkRateLimit(user.id, 60000);
    
    // Check cache first
    const cachedData = await db.getAutoGiftsCache(user.id);
    const cacheAge = cachedData ? Date.now() - cachedData.cachedAt : Infinity;
    const cacheMaxAge = 5 * 60 * 1000; // 5 minutes
    
    // Return cached data if it's fresh
    if (cachedData && cacheAge < cacheMaxAge) {
      console.log('✅ Returning cached portfolio data (age:', Math.round(cacheAge / 1000), 'seconds)');
      return NextResponse.json({
        success: true,
        gifts: cachedData.gifts,
        total_value: cachedData.totalValue,
        cached: true,
        cache_age_seconds: Math.round(cacheAge / 1000)
      });
    }
    
    // If rate limit exceeded, return stale cache or error
    if (!canRefresh) {
      if (cachedData) {
        console.log('⚠️ Rate limit exceeded, returning stale cache');
        return NextResponse.json({
          success: true,
          gifts: cachedData.gifts,
          total_value: cachedData.totalValue,
          cached: true,
          stale: true,
          message: 'Rate limit: please wait 1 minute before refreshing'
        });
      } else {
        console.log('❌ Rate limit exceeded and no cache available');
        return NextResponse.json({
          success: false,
          error: 'Rate limit exceeded. Please wait 1 minute before refreshing.'
        }, { status: 429 });
      }
    }
    
    // Rate limit OK, fetch fresh data
    console.log('🔄 Fetching fresh portfolio data from Python script');
    
    // Update rate limit before making the call
    await db.updateRateLimit(user.id);
    
    // Run the Python script to fetch profile gifts
    const projectRoot = '/root/01studio/CollectibleKIT';
    const pythonScript = path.join(projectRoot, 'bot', 'get_profile_gifts.py');
    const venvPython = '/usr/bin/python3';
    
    // Build command arguments - pass user ID
    const args = [pythonScript, user.id.toString()];
    
    console.log('🐍 Running portfolio gifts script:', {
      python: venvPython,
      script: pythonScript,
      userId: user.id,
      cwd: process.cwd(),
      projectRoot
    });
    
    return new Promise<NextResponse>((resolve, reject) => {
      const python = spawn(venvPython, args, {
        cwd: projectRoot
      });
      let output = '';
      let error = '';
      
      python.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      python.on('close', async (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            console.log('✅ Portfolio gifts fetched successfully');
            
            // Cache the results
            await db.setAutoGiftsCache(user.id, result.gifts || [], result.total_value || 0);
            console.log('✅ Portfolio data cached');
            
            resolve(NextResponse.json({
              ...result,
              cached: false
            }));
          } catch (parseError) {
            console.error('❌ Parse error:', parseError, output);
            resolve(NextResponse.json({
              success: false,
              error: 'Failed to parse response',
              debug: output
            }, { status: 500 }));
          }
        } else {
          console.error('❌ Python script error:', error, output);
          
          // On error, return stale cache if available
          if (cachedData) {
            console.log('⚠️ Returning stale cache due to Python script error');
            resolve(NextResponse.json({
              success: true,
              gifts: cachedData.gifts,
              total_value: cachedData.totalValue,
              cached: true,
              stale: true,
              error: 'Failed to refresh data, showing cached data'
            }));
          } else {
            resolve(NextResponse.json({
              success: false,
              error: error || 'Failed to fetch portfolio gifts',
              debug: output
            }, { status: 500 }));
          }
        }
      });
      
      python.on('error', (err) => {
        console.error('❌ Spawn error:', err);
        
        // On error, return stale cache if available
        if (cachedData) {
          console.log('⚠️ Returning stale cache due to spawn error');
          resolve(NextResponse.json({
            success: true,
            gifts: cachedData.gifts,
            total_value: cachedData.totalValue,
            cached: true,
            stale: true,
            error: 'Failed to refresh data, showing cached data'
          }));
        } else {
          resolve(NextResponse.json({
            success: false,
            error: 'Failed to start Python script'
          }, { status: 500 }));
        }
      });
    });

  } catch (error) {
    console.error('❌ Portfolio gifts error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

