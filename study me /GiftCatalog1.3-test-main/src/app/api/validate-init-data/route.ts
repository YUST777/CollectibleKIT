import { type NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { initData } = await request.json();
    const BOT_TOKEN = process.env.BOT_TOKEN;

    if (!BOT_TOKEN) {
      console.error('BOT_TOKEN not configured in environment variables');
      return NextResponse.json(
        { valid: false, error: 'Bot token not configured' },
        { status: 500 }
      );
    }

    if (!initData) {
      console.warn('Missing initData in /api/validate-init-data');
      return NextResponse.json(
        { valid: false, error: 'Missing initData' },
        { status: 400 }
      );
    }

    // Parse the initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');

    // Create the data check string
    const dataCheckString = Array.from(params.entries())
      .sort()
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Correct secret key calculation
    const secretKey = crypto
      .createHmac('sha256', Buffer.from('WebAppData'))
      .update(BOT_TOKEN)
      .digest();

    // Correct hash calculation
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Check if the hash is valid
    if (calculatedHash === hash) {
      const user = params.get('user') ? JSON.parse(params.get('user') || '{}') : null;
      return NextResponse.json({ valid: true, user });
    } else {
      return NextResponse.json({ valid: false, error: 'Invalid hash' });
    }
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
