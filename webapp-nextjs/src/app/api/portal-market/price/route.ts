import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gift_name, model_name, backdrop_name } = body;

    if (!gift_name) {
      return NextResponse.json(
        { success: false, error: 'Gift name is required' },
        { status: 400 }
      );
    }

    console.log('📊 Fetching Portal Market price:', { gift_name, model_name, backdrop_name });

    // Run the Python script to get gift price
    const projectRoot = process.cwd();
    const pythonScript = path.join(projectRoot, 'bot', 'get_gift_price.py');
    const venvPython = '/usr/bin/python3';

    const args = [pythonScript];
    if (gift_name) args.push('--gift_name', gift_name);
    if (model_name) args.push('--model_name', model_name);
    if (backdrop_name) args.push('--backdrop_name', backdrop_name);

    return new Promise<NextResponse>((resolve, reject) => {
      const python = spawn(venvPython, args);
      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            console.log('✅ Portal price fetched:', result);
            resolve(NextResponse.json(result));
          } catch (parseError) {
            console.error('❌ Error parsing price result:', parseError);
            resolve(NextResponse.json({
              success: false,
              error: 'Invalid response from price service'
            }));
          }
        } else {
          console.error('❌ Python script error:', stderr);
          resolve(NextResponse.json({
            success: false,
            error: 'Failed to fetch price from Portal Market'
          }));
        }
      });

      python.on('error', (error) => {
        console.error('❌ Failed to spawn Python process:', error);
        resolve(NextResponse.json({
          success: false,
          error: 'Failed to start price service'
        }));
      });

      // Set a timeout
      setTimeout(() => {
        python.kill();
        resolve(NextResponse.json({
          success: false,
          error: 'Request timeout'
        }));
      }, 30000); // 30 second timeout
    });

  } catch (error) {
    console.error('❌ Portal Market price error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

