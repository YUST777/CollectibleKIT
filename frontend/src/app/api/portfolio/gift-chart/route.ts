import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const giftName = searchParams.get('name');
    const chartType = searchParams.get('type') || '1w';

    if (!giftName) {
      return NextResponse.json(
        { success: false, error: 'Gift name is required' },
        { status: 400 }
      );
    }

    console.log(`📊 Loading chart for ${giftName} (${chartType})`);

    // Fetch chart data from giftcharts API
    const encodedName = giftName.replace(/ /g, '+');
    const chartTypeEndpoint = (chartType === '1m' || chartType === '3m') ? 'lifeChart' : 'weekChart';
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
        
        // Filter based on chart type
        let filteredData = Array.isArray(data) ? data : [];
        
        if (chartType === '24h') {
          const now = new Date();
          const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          filteredData = filteredData.filter((point: any) => {
            const pointDate = new Date(point.createdAt || point.date);
            return pointDate >= twentyFourHoursAgo;
          });
        } else if (chartType === '3d') {
          const now = new Date();
          const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
          filteredData = filteredData.filter((point: any) => {
            const pointDate = new Date(point.createdAt || point.date);
            return pointDate >= threeDaysAgo;
          });
        } else if (chartType === '1m') {
          const now = new Date();
          const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          filteredData = filteredData.filter((point: any) => {
            const pointDate = new Date(point.createdAt || point.date);
            return pointDate >= oneMonthAgo;
          });
        }

        console.log(`✅ Loaded ${filteredData.length} chart points for ${giftName}`);

        return NextResponse.json({
          success: true,
          data: filteredData
        });
      } else {
        console.error(`❌ Chart API error: ${response.status}`);
        return NextResponse.json({
          success: true,
          data: []
        });
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error(`❌ Error fetching chart for ${giftName}:`, fetchError);
      return NextResponse.json({
        success: true,
        data: []
      });
    }

  } catch (error) {
    console.error('❌ Gift chart error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}

