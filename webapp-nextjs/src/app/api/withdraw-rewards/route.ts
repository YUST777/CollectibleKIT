import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/userService';
import { TonWalletService } from '@/lib/tonWalletService';
import { db } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('💰 Processing withdrawal request');

    const body = await request.json();
    const { userId, amount, walletAddress } = body;

    // Validate required fields
    if (!userId || !amount || !walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userId, amount, or walletAddress' },
        { status: 400 }
      );
    }

    // Validate userId
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum) || userIdNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid withdrawal amount' },
        { status: 400 }
      );
    }

    // Validate wallet address
    if (!TonWalletService.validateWalletAddress(walletAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid TON wallet address' },
        { status: 400 }
      );
    }

    console.log('Withdrawal request:', {
      userId: userIdNum,
      amount: amountNum,
      walletAddress: walletAddress
    });

    // Check user permissions and balance
    const userInfo = await UserService.getUserInfo(userIdNum);
    if (!userInfo) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has enough credits (assuming 1 credit = 1 TON for simplicity)
    const availableCredits = typeof userInfo.credits_remaining === 'number' 
      ? userInfo.credits_remaining 
      : 0;

    if (availableCredits < amountNum) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient credits. Available: ${availableCredits}, Requested: ${amountNum}` 
        },
        { status: 400 }
      );
    }

    // Process withdrawal
    const withdrawalResult = await TonWalletService.sendWithdrawal(
      userIdNum,
      amountNum,
      walletAddress
    );

    if (!withdrawalResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: withdrawalResult.error || 'Withdrawal failed' 
        },
        { status: 500 }
      );
    }

    // Deduct credits from user
    const deductSuccess = await UserService.addCredits(userIdNum, -amountNum);
    if (!deductSuccess) {
      console.error('❌ Failed to deduct credits after successful withdrawal');
      // Note: In a real scenario, you might want to handle this differently
      // as the withdrawal was successful but we couldn't update the user's balance
    }

    console.log('✅ Withdrawal processed successfully:', {
      transactionHash: withdrawalResult.transaction_hash,
      amount: amountNum
    });

    // Record feed event for TON withdrawal
    await db.recordFeedEvent(userIdNum, 'ton_withdrawal', { amount: amountNum });

    return NextResponse.json({
      success: true,
      transaction_hash: withdrawalResult.transaction_hash,
      amount: amountNum,
      wallet_address: walletAddress
    });

  } catch (error) {
    console.error('❌ Withdrawal error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}