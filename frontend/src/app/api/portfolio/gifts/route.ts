import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { spawn } from 'child_process';
import path from 'path';
import { db } from '@/lib/database';
import { successResponse, ApiErrors, handleApiError } from '@/lib/api-response';

// Background update function (non-blocking)
async function triggerBackgroundUpdate(userId: number, userIdentifier: string): Promise<void> {
  try {
    await db.setPortfolioFetching(userId, true);
    
    const projectRoot = '/root/01studio/CollectibleKIT';
    const pythonScript = path.join(projectRoot, 'bot', 'services', 'get_profile_gifts.py');
    const venvPython = '/usr/bin/python3';
    const args = [pythonScript, userIdentifier];
    
    // Run in background (don't wait for result)
    const python = spawn(venvPython, args, {
      cwd: projectRoot,
      detached: true,
      stdio: 'ignore'
    });
    
    python.unref(); // Allow process to exit independently
    
    // Update fetching status after a delay (in case process fails quickly)
    setTimeout(async () => {
      const stillFetching = await db.isPortfolioFetching(userId);
      if (stillFetching) {
        // Process is still running, which is good
      }
    }, 5000);
  } catch (error) {
    console.error('Error triggering background update:', error);
    await db.setPortfolioFetching(userId, false);
  }
}

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
      return ApiErrors.unauthorized();
    }

    console.log('📊 Getting portfolio for user:', user.id);
    
    // Check rate limit (60 seconds = 60000ms)
    const canRefresh = await db.checkRateLimit(user.id, 60000);
    
    // Check cache first - ALWAYS return cached if available (even if stale)
    const cachedData: { gifts: any[]; totalValue: number; cachedAt: number; isFetching?: boolean; fetchStartedAt?: number } | null = await db.getAutoGiftsCache(user.id);
    const cacheAge = cachedData ? Date.now() - cachedData.cachedAt : Infinity;
    const cacheMaxAge = 5 * 60 * 1000; // 5 minutes
    const isFetching = cachedData?.isFetching || false;
    
    // Return cached data immediately if available (even if stale)
    if (cachedData) {
      const isStale = cacheAge >= cacheMaxAge;
      console.log(`✅ Returning cached portfolio data (age: ${Math.round(cacheAge / 1000)}s, stale: ${isStale}, fetching: ${isFetching})`);
      
      // Start background update if stale and not already fetching
      if (isStale && !isFetching && canRefresh) {
        console.log('🔄 Starting background update...');
        // Trigger background update (non-blocking)
        triggerBackgroundUpdate(user.id, user.username || user.id.toString()).catch(err => {
          console.error('Background update error:', err);
        });
      }
      
      const cached = cachedData as { gifts: any[]; totalValue: number; cachedAt: number };
      return successResponse(
        {
          gifts: cached.gifts || [],
          total_value: cached.totalValue
        },
        undefined,
        200,
        {
          cached: true,
          stale: isStale,
          is_fetching: isFetching,
          cache_age_seconds: Math.round(cacheAge / 1000)
        }
      );
    }
    
    // No cache exists - first-time user
    const isFirstLoad = !cachedData;
    
    // If rate limit exceeded and no cache, return error
    if (!canRefresh && !isFirstLoad) {
        console.log('❌ Rate limit exceeded and no cache available');
        return ApiErrors.rateLimitExceeded('Rate limit exceeded. Please wait 1 minute before refreshing.');
    }
    
    // Rate limit OK or first load, fetch fresh data
    console.log('🔄 Fetching fresh portfolio data from Python script', isFirstLoad ? '(first load)' : '');
    
    // Update rate limit before making the call
    await db.updateRateLimit(user.id);
    
    // Run the Python script to fetch profile gifts
    const projectRoot = '/root/01studio/CollectibleKIT';
    const pythonScript = path.join(projectRoot, 'bot', 'services', 'get_profile_gifts.py');
    const venvPython = '/usr/bin/python3';
    
    // Build command arguments - prefer username if available (better for Telethon lookup)
    const userIdentifier = user.username ? `@${user.username}` : user.id.toString();
    const args = [pythonScript, userIdentifier];
    
    console.log('🐍 Running portfolio gifts script:', {
      python: venvPython,
      script: pythonScript,
      userIdentifier: userIdentifier,
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
                const cached = cachedData as { gifts: any[]; totalValue: number; cachedAt: number };
                resolve(NextResponse.json({
                  success: true,
                  gifts: cached.gifts || [],
                  total_value: cached.totalValue,
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
            
            // Cache the results and mark as not fetching
            await db.setAutoGiftsCache(user.id, result.gifts || [], result.total_value || 0, false);
            await db.setPortfolioFetching(user.id, false);
            console.log('✅ Portfolio data cached');
            
            // Create snapshot if it doesn't exist for today
            const todaySnapshot = await db.getPortfolioSnapshot(user.id);
            if (!todaySnapshot) {
              // Create snapshot in background (don't wait)
              db.savePortfolioSnapshot(
                user.id,
                result.total_value || 0,
                result.gifts?.length || 0,
                result.nft_count || 0,
                (result.gifts?.length || 0) - (result.nft_count || 0),
                result.gifts?.filter((g: any) => g.is_upgraded).reduce((sum: number, g: any) => sum + (g.price || 0), 0) || 0,
                result.gifts?.filter((g: any) => !g.is_upgraded).reduce((sum: number, g: any) => sum + (g.price || 0), 0) || 0
              ).catch(err => {
                console.error('Error creating snapshot:', err);
              });
            }
            
            resolve(successResponse(
              {
                gifts: result.gifts || [],
                total_value: result.total_value || 0,
                total: result.total,
                nft_count: result.nft_count
              },
              undefined,
              200,
              { cached: false }
            ));
          } catch (parseError) {
            console.error('❌ Parse error:', parseError, output);
            
            // On parse error, return stale cache if available
            if (cachedData) {
              console.log('⚠️ Returning stale cache due to parse error');
              const cached = cachedData as { gifts: any[]; totalValue: number; cachedAt: number };
              resolve(successResponse(
                {
                  gifts: cached.gifts || [],
                  total_value: cached.totalValue
                },
                'Using cached data',
                200,
                { cached: true, stale: true }
              ));
            } else {
              resolve(ApiErrors.internalServerError('Failed to parse response'));
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
            const cached = cachedData as { gifts: any[]; totalValue: number };
            resolve(successResponse(
              {
                gifts: cached.gifts || [],
                total_value: cached.totalValue
              },
              'Using cached data',
              200,
              { cached: true, stale: true }
            ));
          } else {
            resolve(ApiErrors.internalServerError(actualError));
          }
        }
      });
      
      python.on('error', (err) => {
        console.error('❌ Spawn error:', err);
        
        // On error, return stale cache if available
        if (cachedData) {
          console.log('⚠️ Returning stale cache due to spawn error');
          const cached = cachedData as { gifts: any[]; totalValue: number; cachedAt: number };
          resolve(successResponse(
            {
              gifts: cached.gifts || [],
              total_value: cached.totalValue
            },
            'Failed to refresh data, showing cached data',
            200,
            { cached: true, stale: true }
          ));
        } else {
          resolve(ApiErrors.internalServerError('Failed to start Python script'));
        }
      });
    });

  } catch (error) {
    return handleApiError(error, 'Failed to fetch portfolio gifts');
  }
}

