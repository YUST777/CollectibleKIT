import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getUserFromTelegram } from '@/lib/telegram';

// POST: Convert credits to TON
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creditsToSpend } = await request.json();
    
    if (!creditsToSpend || creditsToSpend <= 0) {
      return NextResponse.json({ error: 'Invalid credits amount' }, { status: 400 });
    }

    console.log(`🔄 Converting ${creditsToSpend} credits to TON for user ${user.id}`);
    
    const result = await db.convertCreditsToTon(user.id, creditsToSpend);
    
    if (result.success) {
      // Get updated user data
      const updatedUser = await db.getUser(user.id);
      
      return NextResponse.json({
        success: true,
        tonEarned: result.tonEarned,
        message: result.message,
        newCreditBalance: updatedUser?.credits || 0,
        newTonBalance: updatedUser?.ton_balance || 0
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.message
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error converting credits to TON:', error);
    return NextResponse.json({ 
      error: 'Failed to convert credits', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}
