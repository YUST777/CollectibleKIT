import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { giftName: string } }
) {
  try {
    const { giftName } = params;
    const decodedGiftName = decodeURIComponent(giftName);
    
    console.log(`🎨 Loading patterns for gift: ${decodedGiftName}`);
    
    // Fetch patterns from the CDN
    const patternsUrl = `https://cdn.changes.tg/gifts/patterns/${encodeURIComponent(decodedGiftName)}/sorted.json`;
    
    const response = await fetch(patternsUrl, {
      // Disable Next.js caching for large responses
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.log(`❌ No patterns found for ${decodedGiftName}`);
      return NextResponse.json({ patterns: [] });
    }
    
    const patterns = await response.json();
    
    console.log(`✅ Loaded ${patterns.length} patterns for ${decodedGiftName}`);
    
    // Return response with no caching
    const responseData = NextResponse.json({ patterns });
    responseData.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return responseData;
    
  } catch (error) {
    console.error(`❌ Error loading patterns:`, error);
    return NextResponse.json(
      { error: 'Failed to load patterns' },
      { status: 500 }
    );
  }
}
