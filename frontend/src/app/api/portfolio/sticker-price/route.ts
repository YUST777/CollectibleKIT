import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * Fetch sticker price from stickers.tools API
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const collection = searchParams.get('collection');
    const pack = searchParams.get('pack');

    if (!collection || !pack) {
      return NextResponse.json(
        { success: false, error: 'Collection and pack name required' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching sticker price:', { collection, pack });

    // Fetch pricing data from stickers.tools
    const pricingResponse = await axios.get('https://stickers.tools/api/stats-new', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      }
    });

    if (pricingResponse.status !== 200 || !pricingResponse.data) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch pricing data' },
        { status: 500 }
      );
    }

    const pricingData = pricingResponse.data;
    const collectionsPricing = pricingData.collections || {};

    // Find matching collection
    let matchingCollectionId: string | null = null;
    for (const [collId, collPricing] of Object.entries(collectionsPricing)) {
      const collName = (collPricing as any).name || '';
      if (collName.toLowerCase() === collection.toLowerCase()) {
        matchingCollectionId = collId;
        break;
      }
    }

    if (!matchingCollectionId) {
      console.warn('⚠️ Collection not found in pricing data:', collection);
      return NextResponse.json({
        success: true,
        init_price_usd: 0,
        current_price_usd: 0
      });
    }

    // Find matching pack/sticker
    const collectionPricing = collectionsPricing[matchingCollectionId] as any;
    const stickersPricing = collectionPricing.stickers || {};

    let initPrice = 0;
    let currentPrice = 0;

    for (const [stickerId, stickerData] of Object.entries(stickersPricing)) {
      const stickerName = (stickerData as any).name || '';
      if (stickerName.toLowerCase() === pack.toLowerCase()) {
        initPrice = (stickerData as any).init_price_usd || 0;
        const currentData = (stickerData as any).current || {};
        const priceData = currentData.price || {};
        const floorData = priceData.floor || {};
        currentPrice = floorData.usd || 0;
        break;
      }
    }

    if (initPrice === 0 && currentPrice === 0) {
      console.warn('⚠️ Pack not found in pricing data:', { collection, pack });
      return NextResponse.json({
        success: true,
        init_price_usd: 0,
        current_price_usd: 0
      });
    }

    console.log('✅ Found sticker price:', { collection, pack, initPrice, currentPrice });

    return NextResponse.json({
      success: true,
      init_price_usd: initPrice,
      current_price_usd: currentPrice
    });

  } catch (error) {
    console.error('❌ Error fetching sticker price:', error);
    // Return 0 price instead of error so the sticker can still be added
    return NextResponse.json({
      success: true,
      init_price_usd: 0,
      current_price_usd: 0
    });
  }
}
