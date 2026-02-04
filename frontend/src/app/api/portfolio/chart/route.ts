import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get portfolio history from database (last 90 days)
    const history = await db.getPortfolioHistory(user.id, 90) || [];

    return NextResponse.json({
      success: true,
      history
    });

  } catch (error) {
    console.error('❌ Portfolio chart error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch portfolio history' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { totalValue, giftsCount } = body;

    // Save portfolio snapshot to database
    await db.savePortfolioSnapshot(user.id, totalValue, giftsCount);

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('❌ Portfolio snapshot error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save portfolio snapshot' },
      { status: 500 }
    );
  }
}

