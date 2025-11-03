import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Fetch unupgradeable gifts from a Telegram user account
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountUsername = searchParams.get('account');
    
    if (!accountUsername) {
      return NextResponse.json(
        { success: false, error: 'Account username required' },
        { status: 400 }
      );
    }
    
    console.log('👤 Fetching account gifts for:', accountUsername);
    
    // Run the Python script to fetch account gifts
    const projectRoot = '/root/01studio/CollectibleKIT';
    const pythonScript = path.join(projectRoot, 'bot', 'get_account_gifts.py');
    const venvPython = '/usr/bin/python3';
    
    const args = [pythonScript, accountUsername];
    
    console.log('🐍 Running account gifts script:', {
      python: venvPython,
      script: pythonScript,
      account: accountUsername,
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
                error: result.error || 'Failed to fetch account gifts'
              }, { status: 500 }));
              return;
            }
            
            console.log('✅ Account gifts fetched successfully');
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
          let actualError = 'Failed to fetch account gifts';
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
    console.error('❌ Account gifts error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
