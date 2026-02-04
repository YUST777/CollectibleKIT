import { NextRequest, NextResponse } from 'next/server';

/**
 * Get patterns for a specific gift (for emoji game)
 * This endpoint fetches from CDN for game purposes
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🎨 Getting patterns for gift (game service)');

    // Get gift name from query params
    const url = new URL(request.url);
    const giftName = url.searchParams.get('gift');

    if (!giftName) {
      return NextResponse.json({
        success: true,
        patterns: []
      });
    }

    try {
      // Fetch patterns from CDN
      const patternsUrl = `https://cdn.changes.tg/gifts/patterns/${encodeURIComponent(giftName)}/sorted.json`;
      console.log(`📡 Fetching patterns from CDN: ${patternsUrl}`);

      const response = await fetch(patternsUrl, {
        cache: 'no-store'
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`⚠️ No patterns found for ${giftName} (404)`);
          return NextResponse.json({
            success: true,
            patterns: []
          });
        }
        throw new Error(`Failed to fetch patterns: ${response.status}`);
      }

      const patternsData = await response.json();

      // Transform the data to match expected format
      const patterns = Array.isArray(patternsData)
        ? patternsData.map((pattern: any) => ({
            name: pattern.name || pattern,
            id: pattern.id || pattern,
            ...(typeof pattern === 'string' ? { name: pattern } : pattern)
          }))
        : [];

      console.log(`✅ Retrieved ${patterns.length} patterns for ${giftName}`);

      return NextResponse.json({
        success: true,
        patterns: patterns
      });
    } catch (fetchError) {
      console.error(`❌ Error fetching patterns for ${giftName}:`, fetchError);
      // Return empty array instead of error to prevent UI crashes
      return NextResponse.json({
        success: true,
        patterns: []
      });
    }

  } catch (error) {
    console.error('❌ Get patterns error:', error);
    // Return empty array instead of error to prevent UI crashes
    return NextResponse.json({
      success: true,
      patterns: [],
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

