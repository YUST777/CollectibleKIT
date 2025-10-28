import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/userService';
import { TonWalletService } from '@/lib/tonWalletService';
import { db } from '@/lib/database';
import { getUserFromTelegram } from '@/lib/telegram';

// Rate limiting storage
const rateLimit = new Map<number, number[]>();

export async function POST(request: NextRequest) {
  try {
    console.log('💰 Processing withdrawal request');

    // ✅ SECURITY FIX: Add authentication check
    const user = await getUserFromTelegram(request);
    if (!user) {
      console.log('❌ Unauthorized withdrawal attempt - no valid user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ SECURITY FIX: Add rate limiting
    const now = Date.now();
    const userRequests = rateLimit.get(user.id) || [];
    const recentRequests = userRequests.filter(time => now - time < 60000); // 1 minute window
    
    if (recentRequests.length >= 3) { // Max 3 withdrawal attempts per minute
      console.log(`❌ Rate limit exceeded for user ${user.id}`);
      return NextResponse.json({ error: 'Rate limit exceeded. Please wait before trying again.' }, { status: 429 });
    }
    
    recentRequests.push(now);
    rateLimit.set(user.id, recentRequests);

    const body = await request.json();
    const { amount, walletAddress } = body; // Remove userId from body - use authenticated user

    // Validate required fields
    if (!amount || !walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: amount or walletAddress' },
        { status: 400 }
      );
    }

    // ✅ SECURITY FIX: Use authenticated user ID
    const userIdNum = user.id;

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid withdrawal amount' },
        { status: 400 }
      );
    }

    // ✅ SECURITY FIX: Sanitize and validate wallet address
    const sanitizedWalletAddress = walletAddress.replace(/[^A-Za-z0-9_-]/g, '');
    if (sanitizedWalletAddress !== walletAddress || sanitizedWalletAddress.length < 40) {
      console.log(`❌ Invalid wallet address format from user ${userIdNum}: ${walletAddress}`);
      return NextResponse.json(
        { success: false, error: 'Invalid TON wallet address format' },
        { status: 400 }
      );
    }

    if (!TonWalletService.validateWalletAddress(sanitizedWalletAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid TON wallet address' },
        { status: 400 }
      );
    }

    // ✅ SECURITY FIX: Add security logging
    console.log('🔒 Withdrawal request:', {
      userId: userIdNum,
      amount: amountNum,
      walletAddress: sanitizedWalletAddress,
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    // Check user permissions and balance
    const userInfo = await db.getUser(userIdNum);
    if (!userInfo) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has enough TON balance
    const availableTon = typeof userInfo.ton_balance === 'number' 
      ? userInfo.ton_balance 
      : 0;

    if (availableTon < amountNum) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient TON balance. Available: ${availableTon}, Requested: ${amountNum}` 
        },
        { status: 400 }
      );
    }

    // Check daily withdrawal limits by calling the Python CLI
    try {
      const { spawn } = require('child_process');
      const path = require('path');
      
      const pythonScript = '/root/01studio/CollectibleKIT/bot/ton_wallet_cli.py';
      
      // ✅ SECURITY FIX: Use sanitized wallet address
      const checkProcess = spawn('python3', [
        pythonScript,
        '--user-id', userIdNum.toString(),
        '--amount', amountNum.toString(),
        '--wallet', sanitizedWalletAddress,
        '--check-only'  // We'll add this flag to the CLI
      ], {
        cwd: process.cwd(),
        env: { ...process.env }
      });

      let checkOutput = '';
      let checkError = '';

      checkProcess.stdout.on('data', (data: any) => {
        checkOutput += data.toString();
      });

      checkProcess.stderr.on('data', (data: any) => {
        checkError += data.toString();
      });

      const checkResult = await new Promise<{code: any, output: string, error: string}>((resolve) => {
        checkProcess.on('close', (code: any) => {
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
      console.error('❌ Error checking daily limits:', error);
      // ✅ SECURITY FIX: Don't continue if limit check fails
      return NextResponse.json(
        { success: false, error: 'Daily limit check failed. Please try again later.' },
        { status: 500 }
      );
    }

    // Process withdrawal
    const withdrawalResult = await TonWalletService.sendWithdrawal(
      userIdNum,
      amountNum,
      sanitizedWalletAddress
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

    // Deduct TON balance from user
    const currentUser = await db.getUser(userIdNum);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    const newTonBalance = Math.max(0, (currentUser.ton_balance || 0) - amountNum);
    const deductSuccess = await db.updateUser(userIdNum, { 
      ton_balance: newTonBalance 
    });
    
    if (!deductSuccess) {
      console.error('❌ Failed to deduct TON balance after successful withdrawal');
      // Note: In a real scenario, you might want to handle this differently
      // as the withdrawal was successful but we couldn't update the user's balance
    }

    console.log('✅ Withdrawal processed successfully:', {
      transactionHash: withdrawalResult.transaction_hash,
      amount: amountNum
    });

    // Record withdrawal in daily tracker
    try {
      const { spawn } = require('child_process');
      const path = require('path');
      
      const pythonScript = '/root/01studio/CollectibleKIT/bot/ton_wallet_cli.py';
      
      // Record the withdrawal in daily tracker
      const recordProcess = spawn('python3', [
        pythonScript,
        '--user-id', userIdNum.toString(),
        '--amount', amountNum.toString(),
        '--wallet', sanitizedWalletAddress,
        '--record-only'  // We'll add this flag to the CLI
      ], {
        cwd: process.cwd(),
        env: { ...process.env }
      });

      recordProcess.on('close', (code: number) => {
        if (code === 0) {
          console.log('✅ Daily withdrawal recorded successfully');
        } else {
          console.warn('⚠️ Failed to record daily withdrawal');
        }
      });
    } catch (error) {
      console.error('Error recording daily withdrawal:', error);
    }

    // Record feed event for TON withdrawal
    await db.recordFeedEvent(userIdNum, 'ton_withdrawal', { amount: amountNum });

    return NextResponse.json({
      success: true,
      transaction_hash: withdrawalResult.transaction_hash,
      amount: amountNum,
      wallet_address: sanitizedWalletAddress
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