import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';

/**
 * GET: Fetch individual gift chart data
 * Returns price history for a specific gift
 */
export async function GET(request: NextRequest) {
  try {
    const telegramUser = await getUserFromTelegram(request);
    if (!telegramUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const giftName = searchParams.get('gift');
    const chartType = searchParams.get('type') || '1w';

    if (!giftName) {
      return NextResponse.json(
        { success: false, error: 'Gift name required' },
        { status: 400 }
      );
    }

    // Fetch chart from external API
    const encodedName = giftName.replace(/ /g, '+');
    const chartTypeEndpoint = (chartType === '1m' || chartType === 'life') ? 'lifeChart' : 'weekChart';
    const chartUrl = `https://giftcharts-api.onrender.com/${chartTypeEndpoint}?name=${encodedName}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(chartUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          success: true,
          data: Array.isArray(data) ? data : []
        });
      }

      return NextResponse.json({
        success: true,
        data: []
      });
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`Error fetching chart for ${giftName}:`, error);
      return NextResponse.json({
        success: true,
        data: []
      });
    }

  } catch (error) {
    console.error('Error in portfolio chart route:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}

