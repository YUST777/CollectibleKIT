import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ giftName: string }> }
) {
  try {
    const { giftName } = await params;
    const decodedGiftName = decodeURIComponent(giftName);
    
    console.log(`🎨 Loading patterns for gift: ${decodedGiftName}`);
    
    // Fetch patterns from the CDN
    const patternsUrl = `https://cdn.changes.tg/gifts/patterns/${encodeURIComponent(decodedGiftName)}/sorted.json`;
    
    const response = await fetch(patternsUrl, {
      // Disable Next.js caching for large responses
      cache: 'no-store'
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`❌ No patterns found for ${decodedGiftName} (404)`);
      } else {
        console.error(`❌ Failed to fetch patterns for ${decodedGiftName}: ${response.status} ${response.statusText}`);
      }
      return NextResponse.json({ patterns: [] });
    }
    
    // Check content type to ensure it's JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`❌ Unexpected content type for ${decodedGiftName}: ${contentType}`);
      return NextResponse.json({ patterns: [] });
    }
    
    let patterns;
    try {
      patterns = await response.json();
    } catch (parseError) {
      console.error(`❌ Failed to parse JSON response for ${decodedGiftName}:`, parseError);
      return NextResponse.json({ patterns: [] });
    }
    
    // Ensure patterns is an array
    if (!Array.isArray(patterns)) {
      console.log(`⚠️ Patterns response is not an array for ${decodedGiftName}, got:`, typeof patterns);
      return NextResponse.json({ patterns: [] });
    }
    
    console.log(`✅ Loaded ${patterns.length} patterns for ${decodedGiftName}`);
    
    // Return response with no caching
    const responseData = NextResponse.json({ patterns });
    responseData.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return responseData;
    
  } catch (error) {
    console.error(`❌ Error loading patterns:`, error);
    return NextResponse.json(
      { patterns: [] },
      { status: 200 }
    );
  }
}

