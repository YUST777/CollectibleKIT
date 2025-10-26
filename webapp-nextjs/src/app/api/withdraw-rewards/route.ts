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

    // Check daily withdrawal limits by calling the Python CLI
    try {
      const { spawn } = require('child_process');
      const path = require('path');
      
      const pythonScript = path.join(process.cwd(), '..', 'bot', 'ton_wallet_cli.py');
      
      // First check if withdrawal is allowed (dry run)
      const checkProcess = spawn('python3', [
        pythonScript,
        '--user-id', userIdNum.toString(),
        '--amount', amountNum.toString(),
        '--wallet', walletAddress,
        '--check-only'  // We'll add this flag to the CLI
      ], {
        cwd: process.cwd(),
        env: { ...process.env }
      });

      let checkOutput = '';
      let checkError = '';

      checkProcess.stdout.on('data', (data) => {
        checkOutput += data.toString();
      });

      checkProcess.stderr.on('data', (data) => {
        checkError += data.toString();
      });

      const checkResult = await new Promise((resolve) => {
        checkProcess.on('close', (code) => {
          resolve({ code, output: checkOutput, error: checkError });
        });
      });

      // If check failed, return the error
      if (checkResult.code !== 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: checkResult.error || 'Daily withdrawal limit exceeded' 
          },
          { status: 400 }
        );
      }

    } catch (error) {
      console.error('Error checking daily limits:', error);
      // Continue with withdrawal if limit check fails
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