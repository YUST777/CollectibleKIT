import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getUserFromTelegram } from '@/lib/telegram';

// GET: Get user's credit conversion history
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`📊 Getting conversion history for user ${user.id}`);
    
    const conversions = await db.getCreditConversions(user.id, 10);
    
    return NextResponse.json({
      success: true,
      conversions: conversions.map(conv => ({
        id: conv.id,
        credits_spent: conv.credits_spent,
        ton_earned: conv.ton_earned,
        conversion_rate: conv.conversion_rate,
        created_at: conv.created_at
      }))
    });
  } catch (error) {
    console.error('Error getting conversions:', error);
    return NextResponse.json({ 
      error: 'Failed to get conversions', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}
