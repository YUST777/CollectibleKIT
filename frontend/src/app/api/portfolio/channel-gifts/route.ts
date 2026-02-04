import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Fetch unupgradeable gifts from a Telegram channel
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelUsername = searchParams.get('channel');
    
    if (!channelUsername) {
      return NextResponse.json(
        { success: false, error: 'Channel username required' },
        { status: 400 }
      );
    }
    
    console.log('📺 Fetching channel gifts for:', channelUsername);
    
    // Run the Python script to fetch channel gifts
    const projectRoot = '/root/01studio/CollectibleKIT';
    const pythonScript = path.join(projectRoot, 'bot', 'get_channel_gifts.py');
    const venvPython = '/usr/bin/python3';
    
    const args = [pythonScript, channelUsername];
    
    console.log('🐍 Running channel gifts script:', {
      python: venvPython,
      script: pythonScript,
      channel: channelUsername,
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
            
            if (result.success === false && result.error) {
              console.error('❌ Python script returned error:', result.error);
              resolve(NextResponse.json({
                success: false,
                error: result.error || 'Failed to fetch channel gifts'
              }, { status: 500 }));
              return;
            }
            
            console.log('✅ Channel gifts fetched successfully');
            resolve(NextResponse.json(result));
          } catch (parseError) {
            console.error('❌ Parse error:', parseError, output);
            resolve(NextResponse.json({
              success: false,
              error: 'Failed to parse response'
            }, { status: 500 }));
          }
        } else {
          console.error('❌ Python script error (exit code', code, '):', error, output);
          
          // Try to parse output as JSON to get the actual error message
          let actualError = 'Failed to fetch channel gifts';
          try {
            if (output.trim()) {
              const parsed = JSON.parse(output);
              if (parsed.error) {
                actualError = parsed.error;
              }
            }
          } catch (e) {
            if (error.trim()) {
              actualError = error.trim();
            }
          }
          
          resolve(NextResponse.json({
            success: false,
            error: actualError
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
    console.error('❌ Channel gifts error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

