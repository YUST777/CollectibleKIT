import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getUserFromTelegram } from '@/lib/telegram';

export async function GET(request: NextRequest) {
  try {
    // Get user from Telegram
    const user = await getUserFromTelegram(request);
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not authenticated' 
      }, { status: 401 });
    }

    const userId = user.id;
    
    // Get user data with premium expiration
    const userData = await db.getUser(userId);
    
    if (!userData) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    const isPremium = userData.user_type === 'premium';
    const expiresAt = userData.premium_expires_at || null;
    const isExpired = expiresAt ? Date.now() > expiresAt : false;
    
    return NextResponse.json({
      success: true,
      isPremium: isPremium && !isExpired,
      expiresAt,
      isExpired,
    });
  } catch (error) {
    console.error('Error fetching premium status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch premium status'
    }, { status: 500 });
  }
}
