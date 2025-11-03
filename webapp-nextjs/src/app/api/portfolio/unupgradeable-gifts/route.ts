import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), '..', 'mrktandquantomapi', 'quant', 'clean_unique_gifts.json');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const gifts = JSON.parse(fileContent);
    
    return NextResponse.json({
      success: true,
      gifts: gifts.map((gift: any) => ({
        id: gift.id,
        name: gift.full_name,
        shortName: gift.short_name,
        floorPrice: parseFloat(gift.floor_price) || 0,
        imageUrl: gift.image_url || `https://cdn.changes.tg/gifts/originals/${gift.id}/Original.png`,
        supply: gift.supply
      }))
    });
  } catch (error) {
    console.error('Error reading unupgradeable gifts:', error);
    return NextResponse.json({
      success: false,
      gifts: []
    }, { status: 500 });
  }
}

