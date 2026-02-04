import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🎲 Getting random gift for zoom game');
    
    // Load gift ID to name mapping
    const idToNameResponse = await fetch('https://cdn.changes.tg/gifts/id-to-name.json');
    if (!idToNameResponse.ok) {
      throw new Error(`Failed to fetch id-to-name data: ${idToNameResponse.status}`);
    }
    const idToNameData = await idToNameResponse.json();
    
    // Get unique gift names (these are the gift types)
    const giftNames = Object.values(idToNameData);
    const uniqueGifts = Array.from(new Set(giftNames)).sort();
    
    if (!uniqueGifts || uniqueGifts.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No gifts available'
      });
    }
    
    // Pick a random gift
    const randomGiftName = uniqueGifts[Math.floor(Math.random() * uniqueGifts.length)] as string;
    
    // Get models for this gift
    const modelsResponse = await fetch(`https://cdn.changes.tg/gifts/models/${encodeURIComponent(randomGiftName)}/sorted.json`);
    if (!modelsResponse.ok) {
      throw new Error(`Failed to fetch models for ${randomGiftName}: ${modelsResponse.status}`);
    }
    const modelsData = await modelsResponse.json();
    
    if (!modelsData || modelsData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No models available for this gift'
      });
    }
    
    // Pick a random model
    const randomModel = modelsData[Math.floor(Math.random() * modelsData.length)].name;
    
    // Pick a random backdrop (1-80)
    const randomBackdrop = Math.floor(Math.random() * 80) + 1;
    
    const result = {
      success: true,
      gift: {
        name: randomGiftName,
        model: randomModel,
        backdrop_index: randomBackdrop,
        // The correct answer is the gift name
        correct_answer: randomGiftName
      }
    };
    
    console.log(`✅ Random gift selected: ${randomGiftName} with model: ${randomModel}`);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error getting random gift:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get random gift'
    }, { status: 500 });
  }
}
