import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';

interface GiftChartPoint {
  createdAt?: string;
  date?: string;
  priceUsd: number;
}

/**
 * GET/POST: Fetch aggregated portfolio chart data
 * Combines prices from all user's gifts based on gift charts API
 * POST: Accepts gifts in request body for faster processing
 */
export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
  try {
    const telegramUser = await getUserFromTelegram(request);
    if (!telegramUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const chartType = searchParams.get('type') || '1w';
    const mode = searchParams.get('mode') || 'gift'; // 'gift' or 'model'
    
    // Get gifts from request body or fetch them
    let gifts: any[] = [];
    
    // Try to get gifts from request body first (POST request only)
    if (request.method === 'POST') {
      try {
        const body = await request.json();
        if (body && Array.isArray(body.gifts)) {
          gifts = body.gifts;
          console.log('📊 Using gifts from request body:', gifts.length);
        }
      } catch (e) {
        console.error('Error parsing request body:', e);
      }
    }
    
    // If no gifts in body, fetch them via API
    if (gifts.length === 0) {
      const initDataHeader = request.headers.get('X-Telegram-Init-Data');
      const headers: Record<string, string> = {};
      if (initDataHeader) {
        headers['X-Telegram-Init-Data'] = initDataHeader;
      }

      const url = new URL(request.url);
      const baseUrl = `${url.protocol}//${url.host}`;
      
      // Add timeout for the gifts fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const giftsResponse = await fetch(`${baseUrl}/api/portfolio/gifts`, {
          headers,
          cache: 'no-store',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (giftsResponse.ok) {
          const giftsData = await giftsResponse.json();
          if (giftsData.success && giftsData.gifts && giftsData.gifts.length > 0) {
            gifts = giftsData.gifts;
            console.log('📊 Fetched gifts via API:', gifts.length);
          }
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('❌ Error fetching gifts:', fetchError);
      }
    }
    
    if (gifts.length === 0) {
      console.log('⚠️ No gifts available for portfolio chart');
      return NextResponse.json({
        success: true,
        data: []
      });
    }
    const uniqueGiftNames = new Set<string>();
    
    // Collect unique gift names
    gifts.forEach((gift: any) => {
      if (gift.title || gift.slug) {
        uniqueGiftNames.add(gift.title || gift.slug);
      }
    });

    // Fetch chart data for each unique gift
    const chartPromises = Array.from(uniqueGiftNames).map(async (giftName) => {
      try {
        const encodedName = giftName.replace(/ /g, '+');
        const chartTypeEndpoint = (chartType === '1m' || chartType === 'life') ? 'lifeChart' : 'weekChart';
        const chartUrl = `https://giftcharts-api.onrender.com/${chartTypeEndpoint}?name=${encodedName}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(chartUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          return { giftName, data: Array.isArray(data) ? data : [] };
        }
        return { giftName, data: [] };
      } catch (error) {
        console.error(`Error fetching chart for ${giftName}:`, error);
        return { giftName, data: [] };
      }
    });

    const chartResults = await Promise.all(chartPromises);

    // Aggregate prices by timestamp/date
    const priceMap = new Map<string, number>();

    chartResults.forEach(({ giftName, data }) => {
      // Count how many of this gift the user has
      const giftCount = gifts.filter((g: any) => (g.title || g.slug) === giftName).length;
      
      data.forEach((point: GiftChartPoint) => {
        let key: string;
        
        if (point.createdAt) {
          // weekChart format - use createdAt
          const date = new Date(point.createdAt);
          key = date.toISOString();
        } else if (point.date) {
          // lifeChart format - use date field
          key = point.date;
        } else {
          return; // Skip invalid points
        }

        const price = parseFloat(point.priceUsd as any) || 0;
        const existingValue = priceMap.get(key) || 0;
        // Add price * quantity for this gift
        priceMap.set(key, existingValue + (price * giftCount));
      });
    });

    // Convert map to array and sort by date
    const aggregatedData = Array.from(priceMap.entries())
      .map(([key, price]) => {
        let timestamp: string;
        let dateStr: string;

        // Try to parse as ISO date first (weekChart)
        const isoDate = new Date(key);
        if (!isNaN(isoDate.getTime())) {
          timestamp = key;
          dateStr = isoDate.toISOString();
        } else {
          // Parse as DD-MM-YYYY (lifeChart)
          const [day, month, year] = key.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          timestamp = date.toISOString();
          dateStr = key;
        }

        return {
          timestamp,
          date: dateStr,
          priceUsd: price,
          price: price
        };
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Filter based on chart type
    const now = new Date();
    let filteredData = aggregatedData;

    if (chartType === '24h') {
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      filteredData = aggregatedData.filter(point => 
        new Date(point.timestamp) >= twentyFourHoursAgo
      );
    } else if (chartType === '3d') {
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      filteredData = aggregatedData.filter(point => 
        new Date(point.timestamp) >= threeDaysAgo
      );
    } else if (chartType === '1m') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredData = aggregatedData.filter(point => 
        new Date(point.timestamp) >= oneMonthAgo
      );
    }
    // '1w' uses all data (no filter needed)

    return NextResponse.json({
      success: true,
      data: filteredData
    });

  } catch (error) {
    console.error('Error in aggregated portfolio chart route:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch aggregated chart data' },
      { status: 500 }
    );
  }
}

