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
    
    // If no cache exists, allow the request (first-time user)
    const isFirstLoad = !cachedData;
    
    // If rate limit exceeded, return stale cache or continue for first load
    if (!canRefresh && !isFirstLoad) {
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
    
    // Rate limit OK or first load, fetch fresh data
    console.log('🔄 Fetching fresh portfolio data from Python script', isFirstLoad ? '(first load)' : '');
    
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
            // Filter out informational stderr messages (Portal Market auth, etc.)
            // Only show actual errors in stderr
            const stderrFiltered = error
              .split('\n')
              .filter((line: string) => {
                // Filter out success/info messages
                const lowerLine = line.toLowerCase();
                return !lowerLine.includes('portal market authentication successful') &&
                       !lowerLine.includes('fetching gifts for user') &&
                       !lowerLine.includes('connected as') &&
                       !lowerLine.includes('aportalsmp not available');
              })
              .join('\n');
            
            if (stderrFiltered.trim()) {
              console.log('ℹ️ Python stderr (non-critical):', stderrFiltered);
            }
            
            const result = JSON.parse(output);
            
            // Check if result has error (even with exit code 0)
            if (result.success === false && result.error) {
              console.error('❌ Python script returned error:', result.error);
              
              // On error, return stale cache if available
              if (cachedData) {
                console.log('⚠️ Returning stale cache due to Python script error');
                resolve(NextResponse.json({
                  success: true,
                  gifts: cachedData.gifts,
                  total_value: cachedData.totalValue,
                  cached: true,
                  stale: true,
                  message: 'Using cached data'
                }));
              } else {
                resolve(NextResponse.json({
                  success: false,
                  error: result.error || 'Failed to fetch portfolio gifts'
                }, { status: 500 }));
              }
              return;
            }
            
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
            
            // On parse error, return stale cache if available
            if (cachedData) {
              console.log('⚠️ Returning stale cache due to parse error');
              resolve(NextResponse.json({
                success: true,
                gifts: cachedData.gifts,
                total_value: cachedData.totalValue,
                cached: true,
                stale: true,
                message: 'Using cached data'
              }));
            } else {
              resolve(NextResponse.json({
                success: false,
                error: 'Failed to parse response'
              }, { status: 500 }));
            }
          }
        } else {
          // Filter stderr to remove informational messages
          const stderrFiltered = error
            .split('\n')
            .filter((line: string) => {
              const lowerLine = line.toLowerCase();
              return !lowerLine.includes('portal market authentication successful') &&
                     !lowerLine.includes('fetching gifts for user') &&
                     !lowerLine.includes('connected as');
            })
            .join('\n');
          
          console.error('❌ Python script error (exit code', code, '):', stderrFiltered || 'Unknown error', output);
          
          // Try to parse output as JSON to get the actual error message
          let actualError = 'Failed to fetch portfolio gifts';
          try {
            if (output.trim()) {
              const parsed = JSON.parse(output);
              if (parsed.error) {
                actualError = parsed.error;
              }
            }
          } catch (e) {
            // If we can't parse, use stderr or default message
            if (stderrFiltered.trim()) {
              actualError = stderrFiltered.trim();
            }
          }
          
          // On error, return stale cache if available
          if (cachedData) {
            console.log('⚠️ Returning stale cache due to Python script error');
            resolve(NextResponse.json({
              success: true,
              gifts: cachedData.gifts,
              total_value: cachedData.totalValue,
              cached: true,
              stale: true,
              message: 'Using cached data'
            }));
          } else {
            resolve(NextResponse.json({
              success: false,
              error: actualError
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

