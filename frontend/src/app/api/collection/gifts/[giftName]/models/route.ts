import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ giftName: string }> }
) {
  try {
    const { giftName } = await params;
    
    if (!giftName) {
      return NextResponse.json(
        { success: false, error: 'Gift name is required' },
        { status: 400 }
      );
    }
    
    console.log(`🎁 Loading models for gift: ${giftName}`);
    
    // Fetch sorted.json for this gift
    const response = await fetch(`https://cdn.changes.tg/gifts/models/${encodeURIComponent(giftName)}/sorted.json`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`⚠️ No models found for ${giftName} (404)`);
        return NextResponse.json({
          success: true,
          models: []
        });
      }
      console.error(`❌ Failed to fetch models for ${giftName}: ${response.status} ${response.statusText}`);
      return NextResponse.json({
        success: true,
        models: []
      });
    }
    
    // Check content type to ensure it's JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`❌ Unexpected content type for ${giftName}: ${contentType}`);
      return NextResponse.json({
        success: true,
        models: []
      });
    }
    
    let sortedData;
    try {
      sortedData = await response.json();
    } catch (parseError) {
      console.error(`❌ Failed to parse JSON response for ${giftName}:`, parseError);
      return NextResponse.json({
        success: true,
        models: []
      });
    }
    
    // Convert to our format - sorted.json is array of objects with name and rarityPermille
    const models = Array.isArray(sortedData) ? sortedData.map((model: any, index: number) => ({
      number: index + 1,
      name: model.name || model,
      rarity: model.rarityPermille || 0
    })) : [];
    
    console.log(`✅ Loaded ${models.length} models for ${giftName}`);
    
    return NextResponse.json({
      success: true,
      models
    });
  } catch (error) {
    console.error('❌ Error loading gift models:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load models' },
      { status: 500 }
    );
  }
}

