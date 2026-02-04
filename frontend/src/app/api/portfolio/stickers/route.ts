import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Get sticker portfolio for the authenticated user
 * This endpoint fetches the user's sticker portfolio from stickerdom.store
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Sticker portfolio API called');
    
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('📊 Getting sticker portfolio for user:', user.id);
    
    // Run the Python script to fetch sticker portfolio
    const projectRoot = '/root/01studio/CollectibleKIT';
    const pythonScript = path.join(projectRoot, 'bot', 'services', 'get_sticker_profile.py');
    const venvPython = '/usr/bin/python3';
    
    const args = [pythonScript, user.id.toString()];
    
    console.log('🐍 Running sticker portfolio script:', {
      python: venvPython,
      script: pythonScript,
      userId: user.id,
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
        console.log(`📊 Sticker script exited with code ${code}`);
        
        if (code !== 0) {
          console.error('❌ Sticker script error:', error);
          resolve(NextResponse.json(
            { 
              success: false, 
              error: error || 'Failed to fetch sticker portfolio' 
            },
            { status: 500 }
          ));
          return;
        }
        
        try {
          const data = JSON.parse(output);
          console.log('✅ Sticker portfolio fetched successfully');
          resolve(NextResponse.json(data));
        } catch (parseError) {
          console.error('❌ Failed to parse sticker data:', parseError, 'Output:', output);
          resolve(NextResponse.json(
            { 
              success: false, 
              error: 'Invalid response from sticker service' 
            },
            { status: 500 }
          ));
        }
      });
      
      python.on('error', (spawnError) => {
        console.error('❌ Failed to spawn sticker script:', spawnError);
        reject(NextResponse.json(
          { 
            success: false, 
            error: 'Failed to start sticker service' 
          },
          { status: 500 }
        ));
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        python.kill();
        reject(NextResponse.json(
          { 
            success: false, 
            error: 'Sticker portfolio request timed out' 
          },
          { status: 504 }
        ));
      }, 30000);
    });

  } catch (error) {
    console.error('❌ Sticker portfolio error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

