import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { db } from '@/lib/database';

/**
 * Get premium status
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

    const userData = await db.getUser(user.id);
    if (!userData) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const now = Date.now();
    const isPremium = userData.premium_expires_at && userData.premium_expires_at > now;
    const isVip = userData.user_type === 'vip';

    return NextResponse.json({
      success: true,
      isPremium: isPremium || isVip,
      premiumExpiresAt: userData.premium_expires_at,
      userType: userData.user_type
    });

  } catch (error) {
    console.error('❌ Premium status error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
