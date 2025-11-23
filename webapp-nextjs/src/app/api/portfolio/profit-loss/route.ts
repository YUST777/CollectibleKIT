import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { db } from '@/lib/database';

/**
 * Get profit/loss data for user's portfolio
 * Returns daily, weekly, monthly changes and all-time high/low
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const profitLoss = await db.getProfitLoss(user.id);

    return NextResponse.json({
      success: true,
      profit_loss: profitLoss
    });

  } catch (error) {
    console.error('❌ Profit/loss error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

