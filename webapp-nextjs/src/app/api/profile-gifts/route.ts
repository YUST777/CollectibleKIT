import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Get profile gifts for a user
 * This endpoint returns the user's saved Telegram Star gifts
 */
export async function GET(request: NextRequest) {
  try {
    // Get user_id from query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    
    // Run the Python script to fetch profile gifts
    const pythonScript = path.join(process.cwd(), '..', 'bot', 'get_profile_gifts.py');
    // Use the main venv which has telethon installed
    const venvPython = path.join(process.cwd(), '..', 'venv', 'bin', 'python');
    
    // Build command arguments
    const args = [pythonScript];
    if (userId) {
      args.push(userId);
    }
    
    return new Promise((resolve, reject) => {
      const python = spawn(venvPython, args);
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
            resolve(NextResponse.json(result));
          } catch (parseError) {
            console.error('Parse error:', parseError, output);
            resolve(NextResponse.json({
              success: false,
              error: 'Failed to parse response',
              debug: output
            }, { status: 500 }));
          }
        } else {
          console.error('Python script error:', error, output);
          resolve(NextResponse.json({
            success: false,
            error: error || 'Failed to fetch profile gifts'
          }, { status: 500 }));
        }
      });
      
      python.on('error', (err) => {
        console.error('Spawn error:', err);
        resolve(NextResponse.json({
          success: false,
          error: 'Failed to start Python script'
        }, { status: 500 }));
      });
    });
    
  } catch (error) {
    console.error('Error fetching profile gifts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile gifts' },
      { status: 500 }
    );
  }
}

