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
      gifts: gifts.map((gift: any) => {
        let imageUrl = gift.image_url;
        
        // If no image_url provided, determine the correct URL based on gift ID format
        if (!imageUrl) {
          const giftId = gift.id?.toString() || '';
          
          // Check if gift ID looks like a slug (upgraded gift format: "Collection-Number")
          // Upgraded gifts have slugs like "TamaGadget-65287", "JollyChimp-38859", etc.
          if (giftId.includes('-') && /^[a-zA-Z]/.test(giftId)) {
            // This is an upgraded gift slug - use fragment.com URL format
            imageUrl = `https://nft.fragment.com/gift/${giftId.toLowerCase()}.medium.jpg`;
          } else {
            // This is a numeric ID (unupgradeable gift) - use cdn.changes.tg URL
            imageUrl = `https://cdn.changes.tg/gifts/originals/${giftId}/Original.png`;
          }
        }
        
        return {
          id: gift.id,
          name: gift.full_name,
          shortName: gift.short_name,
          floorPrice: parseFloat(gift.floor_price) || 0,
          imageUrl: imageUrl,
          supply: gift.supply
        };
      })
    });
  } catch (error) {
    console.error('Error reading unupgradeable gifts:', error);
    return NextResponse.json({
      success: false,
      gifts: []
    }, { status: 500 });
  }
}

