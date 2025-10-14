import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { giftName: string } }
) {
  try {
    const { giftName } = params;
    
    if (!giftName) {
      return NextResponse.json(
        { success: false, error: 'Gift name is required' },
        { status: 400 }
      );
    }
    
    console.log(`🎁 Loading models for gift: ${giftName}`);
    
    // Fetch sorted.json for this gift
    const response = await fetch(`https://cdn.changes.tg/gifts/models/${encodeURIComponent(giftName)}/sorted.json`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models for ${giftName}: ${response.status}`);
    }
    
    const sortedData = await response.json();
    
    // Convert to our format - sorted.json is array of objects with name and rarityPermille
    const models = sortedData.map((model: any, index: number) => ({
      number: index + 1,
      name: model.name,
      rarity: model.rarityPermille
    }));
    
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




