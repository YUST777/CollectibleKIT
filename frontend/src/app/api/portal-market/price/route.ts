import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Get Portal Market price for a gift
 * This endpoint fetches the floor price from Portal Market API via Python script
 */
export async function POST(request: NextRequest) {
  try {
    const { gift_name, model_name, backdrop_name } = await request.json();
    
    if (!gift_name) {
      return NextResponse.json(
        { success: false, error: 'Gift name is required' },
        { status: 400 }
      );
    }
    
    // Run the Python script to get Portal Market price
    const projectRoot = '/root/01studio/CollectibleKIT';
    const pythonScript = path.join(projectRoot, 'bot', 'get_portal_price.py');
    const venvPython = '/usr/bin/python3';
    
    // Build command arguments
    const args = [pythonScript, '--gift', gift_name];
    if (model_name) {
      args.push('--model', model_name);
    }
    if (backdrop_name) {
      args.push('--backdrop', backdrop_name);
    }
    
    console.log('🐍 Running Portal Market price script:', {
      python: venvPython,
      script: pythonScript,
      args
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
            // Filter stderr to remove informational messages
            const stderrFiltered = error
              .split('\n')
              .filter((line: string) => {
                const lowerLine = line.toLowerCase();
                return !lowerLine.includes('portal market authentication successful') &&
                       !lowerLine.includes('searching for gift');
              })
              .join('\n');
            
            if (stderrFiltered.trim()) {
              console.log('ℹ️ Python stderr (non-critical):', stderrFiltered);
            }
            
            const result = JSON.parse(output);
            
            if (result.success === false && result.error) {
              console.error('❌ Python script returned error:', result.error);
              resolve(NextResponse.json({
                success: false,
                error: result.error,
                price: null
              }));
              return;
            }
            
            console.log('✅ Portal Market price fetched successfully');
            resolve(NextResponse.json({
              success: true,
              price: result.price,
              cached: false
            }));
          } catch (parseError) {
            console.error('❌ Parse error:', parseError, output);
            resolve(NextResponse.json({
              success: false,
              error: 'Failed to parse response',
              price: null
            }, { status: 500 }));
          }
        } else {
          // Filter stderr to remove informational messages
          const stderrFiltered = error
            .split('\n')
            .filter((line: string) => {
              const lowerLine = line.toLowerCase();
              return !lowerLine.includes('portal market authentication successful') &&
                     !lowerLine.includes('searching for gift');
            })
            .join('\n');
          
          console.error('❌ Python script error (exit code', code, '):', stderrFiltered || 'Unknown error', output);
          
          // Try to parse output as JSON to get the actual error message
          let actualError = 'Failed to fetch Portal Market price';
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
          
          resolve(NextResponse.json({
            success: false,
            error: actualError,
            price: null
          }, { status: 500 }));
        }
      });
      
      python.on('error', (err) => {
        console.error('❌ Spawn error:', err);
        resolve(NextResponse.json({
          success: false,
          error: 'Failed to start Python script',
          price: null
        }, { status: 500 }));
      });
    });
    
  } catch (error) {
    console.error('Error fetching Portal Market price:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Portal Market price', price: null },
      { status: 500 }
    );
  }
}

