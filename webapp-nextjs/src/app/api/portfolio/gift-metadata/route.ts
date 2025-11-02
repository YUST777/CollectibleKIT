import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Get gift metadata (attributes) from Telegram NFT page
 * This endpoint fetches Model, Backdrop, Symbol, and Quantity for a gift
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const giftName = searchParams.get('gift_name');
    const itemId = searchParams.get('item_id');
    
    if (!giftName || !itemId) {
      return NextResponse.json(
        { success: false, error: 'gift_name and item_id are required' },
        { status: 400 }
      );
    }
    
    // Run the Python script to get gift metadata
    const projectRoot = '/root/01studio/CollectibleKIT';
    const pythonScript = path.join(projectRoot, 'bot', 'get_gift_metadata.py');
    const venvPython = '/usr/bin/python3';
    
    // Build command arguments
    const args = [pythonScript, giftName, itemId];
    
    console.log('🐍 Running gift metadata script:', {
      python: venvPython,
      script: pythonScript,
      giftName,
      itemId
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
            
            if (result.success === false && result.error) {
              console.error('❌ Python script returned error:', result.error);
              resolve(NextResponse.json({
                success: false,
                error: result.error
              }));
              return;
            }
            
            console.log('✅ Gift metadata fetched successfully');
            resolve(NextResponse.json(result));
          } catch (parseError) {
            console.error('❌ Parse error:', parseError, output);
            resolve(NextResponse.json({
              success: false,
              error: 'Failed to parse response'
            }, { status: 500 }));
          }
        } else {
          // Try to parse output as JSON to get the actual error message
          let actualError = 'Failed to fetch gift metadata';
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
          
          console.error('❌ Python script error (exit code', code, '):', actualError);
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
    console.error('Error fetching gift metadata:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch gift metadata' },
      { status: 500 }
    );
  }
}


