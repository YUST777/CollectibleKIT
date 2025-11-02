import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Get portfolio gifts for the authenticated user
 * This endpoint fetches the user's saved Telegram Star gifts using Python script
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
      
      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            console.log('✅ Portfolio gifts fetched successfully');
            resolve(NextResponse.json(result));
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
          resolve(NextResponse.json({
            success: false,
            error: error || 'Failed to fetch portfolio gifts',
            debug: output
          }, { status: 500 }));
        }
      });
      
      python.on('error', (err) => {
        console.error('❌ Spawn error:', err);
        resolve(NextResponse.json({
          success: false,
          error: 'Failed to start Python script'
        }, { status: 500 }));
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

