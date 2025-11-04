import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Get all unupgradeable gifts (the 29 gifts like REDO, etc.)
 * Returns gifts with image URLs constructed from their IDs
 */
export async function GET() {
  try {
    // Read from clean_unique_gifts.json
    const filePath = path.join('/root/01studio/CollectibleKIT/mrktandquantomapi/quant/clean_unique_gifts.json');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const gifts = JSON.parse(fileContent);
    
    // Filter only REGULAR type gifts (unupgradeable)
    const unupgradeableGifts = gifts
      .filter((gift: any) => gift.type === 'REGULAR')
      .map((gift: any) => {
        // Construct image URL - unupgradeable gifts use cdn.changes.tg
        const imageUrl = `https://cdn.changes.tg/gifts/originals/${gift.id}/Original.png`;
        
        return {
          id: gift.id.toString(),
          name: gift.full_name || gift.short_name,
          shortName: gift.short_name,
          floorPrice: parseFloat(gift.floor_price) || 0,
          imageUrl: imageUrl,
          supply: gift.supply || 0
        };
      });
    
    return NextResponse.json({
      success: true,
      gifts: unupgradeableGifts
    });
  } catch (error) {
    console.error('Error loading unupgradeable gifts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load unupgradeable gifts' },
      { status: 500 }
    );
  }
}

