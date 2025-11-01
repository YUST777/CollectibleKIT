import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🎁 Loading gift catalog data...');
    
    // Load gift ID to name mapping
    const idToNameResponse = await fetch('https://cdn.changes.tg/gifts/id-to-name.json');
    if (!idToNameResponse.ok) {
      throw new Error(`Failed to fetch id-to-name data: ${idToNameResponse.status}`);
    }
    const idToNameData = await idToNameResponse.json();
    
    // Get unique gift names (these are the gift types)
    const giftNames = Object.values(idToNameData);
    const uniqueGifts = Array.from(new Set(giftNames)).sort();
    
    console.log(`✅ Loaded ${uniqueGifts.length} unique gifts`);
    
    return NextResponse.json({
      success: true,
      gifts: uniqueGifts
    });
  } catch (error) {
    console.error('❌ Error loading gift catalog:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load gifts' },
      { status: 500 }
    );
  }
}

