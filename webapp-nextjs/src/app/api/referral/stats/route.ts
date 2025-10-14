import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

// GET: Get referral stats for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const referrerId = searchParams.get('referrer_id');
    
    console.log('Referral stats API called with referrer_id:', referrerId);
    
    if (!referrerId) {
      return NextResponse.json({ error: 'Missing referrer_id' }, { status: 400 });
    }

    const stats = await db.getReferralStats(Number(referrerId));
    console.log('Referral stats returned:', stats);
    
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch referral stats', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}



