import { NextResponse } from 'next/server';

// Cache for TON price with 1 hour expiration
let cachedPrice: number | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Get TON to USD exchange rate with caching
 * Cache expires after 1 hour
 */
export async function GET() {
  try {
    const now = Date.now();
    
    // Return cached price if still valid
    if (cachedPrice !== null && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('📊 TON price from cache:', cachedPrice);
      return NextResponse.json({
        success: true,
        rate: cachedPrice,
        cached: true
      });
    }
    
    console.log('📊 Fetching fresh TON price from CoinGecko...');
    
    // Fetch fresh price from CoinGecko
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd', {
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`CoinGecko API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data['the-open-network']?.usd) {
      throw new Error('Invalid data format from CoinGecko');
    }
    
    const rate = data['the-open-network'].usd;
    
    // Update cache
    cachedPrice = rate;
    cacheTimestamp = now;
    
    console.log('✅ Fresh TON price fetched:', rate);
    
    return NextResponse.json({
      success: true,
      rate: rate,
      cached: false
    });
    
  } catch (error) {
    console.error('❌ Error fetching TON price:', error);
    
    // Return cached price even if expired if available
    if (cachedPrice !== null) {
      console.log('⚠️ Using stale TON price from cache');
      return NextResponse.json({
        success: true,
        rate: cachedPrice,
        cached: true,
        stale: true
      });
    }
    
    // Last resort: default fallback
    return NextResponse.json({
      success: true,
      rate: 2.5, // Default fallback
      cached: false,
      fallback: true
    });
  }
}




