import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🎨 Loading backdrop colors...');
    
    // Load backdrop colors
    const backdropsResponse = await fetch('https://cdn.changes.tg/gifts/backdrops.json');
    
    if (!backdropsResponse.ok) {
      throw new Error(`Failed to fetch backdrops: ${backdropsResponse.status}`);
    }
    
    const backdropsData = await backdropsResponse.json();
    
    console.log(`✅ Loaded ${backdropsData.length} backdrop colors`);
    
    return NextResponse.json({
      success: true,
      backdrops: backdropsData
    });
  } catch (error) {
    console.error('❌ Error loading backdrops:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load backdrops' },
      { status: 500 }
    );
  }
}


