import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { UserService } from '@/lib/userService';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Starting credit system tests...');

    const testResults = [];

    // Test 1: Check if premium users don't pay credits
    testResults.push({
      test: 'Test 1: Premium user unlimited access',
      status: 'PENDING'
    });

    try {
      const premiumUser = await db.getUser(7660176383);
      if (premiumUser) {
        const permissions = await UserService.getUserPermissions(7660176383);
        
        testResults[testResults.length - 1] = {
          test: 'Test 1: Premium user unlimited access',
          status: permissions.user_type === 'premium' ? 'PASS' : 'FAIL',
          details: `user_type: ${permissions.user_type}, can_process: ${permissions.can_process}, watermark: ${permissions.watermark}, credits_remaining: ${permissions.credits_remaining}`
        };
      }
    } catch (error) {
      testResults[testResults.length - 1] = {
        test: 'Test 1: Premium user unlimited access',
        status: 'ERROR',
        error: (error as Error).message
      };
    }

    // Test 2: Check if normal users need credits
    testResults.push({
      test: 'Test 2: Normal user credit requirement',
      status: 'PENDING'
    });

    try {
      // Create a test normal user
      await db.createUser(999999999, 'testuser', 'Test');
      const testUser = await db.getUser(999999999);
      if (testUser) {
        const permissions = await UserService.getUserPermissions(999999999);
        
        testResults[testResults.length - 1] = {
          test: 'Test 2: Normal user credit requirement',
          status: permissions.user_type === 'normal' && permissions.credits_remaining === testUser.credits ? 'PASS' : 'FAIL',
          details: `user_type: ${permissions.user_type}, can_process: ${permissions.can_process}, credits: ${testUser.credits}`
        };
      }
    } catch (error) {
      testResults[testResults.length - 1] = {
        test: 'Test 2: Normal user credit requirement',
        status: 'ERROR',
        error: (error as Error).message
      };
    }

    // Test 3: Check if new users get 20 starting credits
    testResults.push({
      test: 'Test 3: New users start with 20 credits',
      status: 'PENDING'
    });

    try {
      await db.createUser(888888888, 'newuser', 'New');
      const newUser = await db.getUser(888888888);
      
      testResults[testResults.length - 1] = {
        test: 'Test 3: New users start with 20 credits',
        status: newUser && newUser.credits === 20 ? 'PASS' : 'FAIL',
        details: `credits: ${newUser?.credits || 0}`
      };
    } catch (error) {
      testResults[testResults.length - 1] = {
        test: 'Test 3: New users start with 20 credits',
        status: 'ERROR',
        error: (error as Error).message
      };
    }

    // Test 4: Check credit deduction for normal users
    testResults.push({
      test: 'Test 4: Credit deduction works',
      status: 'PENDING'
    });

    try {
      await db.createUser(777777777, 'deductuser', 'Deduct');
      const userBefore = await db.getUser(777777777);
      const creditsBefore = userBefore?.credits || 0;

      // Process a request (should deduct 1 credit)
      await db.updateUserCredits(777777777, -1);
      
      const userAfter = await db.getUser(777777777);
      const creditsAfter = userAfter?.credits || 0;

      const deducted = creditsBefore - creditsAfter === 1;

      testResults[testResults.length - 1] = {
        test: 'Test 4: Credit deduction works',
        status: deducted ? 'PASS' : 'FAIL',
        details: `Credits before: ${creditsBefore}, after: ${creditsAfter}, deducted: ${deducted}`
      };
    } catch (error) {
      testResults[testResults.length - 1] = {
        test: 'Test 4: Credit deduction works',
        status: 'ERROR',
        error: (error as Error).message
      };
    }

    // Test 5: Check that users without credits can't use tools
    testResults.push({
      test: 'Test 5: Users without credits blocked',
      status: 'PENDING'
    });

    try {
      await db.createUser(666666666, 'nocreduser', 'NoCred');
      // Set credits to 0
      await db.updateUser(666666666, { credits: 0 });
      
      const permissions = await UserService.getUserPermissions(666666666);
      
      testResults[testResults.length - 1] = {
        test: 'Test 5: Users without credits blocked',
        status: permissions.can_process === false ? 'PASS' : 'FAIL',
        details: `can_process: ${permissions.can_process}, message: ${permissions.message}`
      };
    } catch (error) {
      testResults[testResults.length - 1] = {
        test: 'Test 5: Users without credits blocked',
        status: 'ERROR',
        error: (error as Error).message
      };
    }

    // Test 6: Check convert credits to TON
    testResults.push({
      test: 'Test 6: Convert credits to TON',
      status: 'PENDING'
    });

    try {
      // Get your premium user
      const premiumUser = await db.getUser(7660176383);
      if (premiumUser && premiumUser.credits >= 50) {
        const response = await fetch('https://collectablekit.01studio.xyz/api/credits/convert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': 'user=%7B%22id%22%3A7660176383%2C%22first_name%22%3A%22The01Studio%20Support%22%7D&auth_date=1734123456&hash=test'
          },
          body: JSON.stringify({
            creditsToSpend: 50
          })
        });

        const result = await response.json();
        
        testResults[testResults.length - 1] = {
          test: 'Test 6: Convert credits to TON',
          status: result.success ? 'PASS' : 'FAIL',
          details: `Response: ${JSON.stringify(result)}`
        };
      } else {
        testResults[testResults.length - 1] = {
          test: 'Test 6: Convert credits to TON',
          status: 'SKIP',
          details: 'User does not have enough credits (need 50, have ' + premiumUser?.credits + ')'
        };
      }
    } catch (error) {
      testResults[testResults.length - 1] = {
        test: 'Test 6: Convert credits to TON',
        status: 'ERROR',
        error: (error as Error).message
      };
    }

    // Test 7: Withdraw TON to wallet
    testResults.push({
      test: 'Test 7: Withdraw TON to wallet',
      status: 'PENDING'
    });

    try {
      // First check if user has TON balance
      const userWithTon = await db.getUser(7660176383);
      console.log('🔍 User data:', { ton_balance: userWithTon?.ton_balance, wallet_address: userWithTon?.wallet_address });
      
      if (userWithTon && (userWithTon.ton_balance || 0) >= 0.2 && userWithTon.wallet_address) {
        const response = await fetch('https://collectablekit.01studio.xyz/api/withdraw-rewards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': 'user=%7B%22id%22%3A7660176383%2C%22first_name%22%3A%22The01Studio%20Support%22%7D&auth_date=1734123456&hash=test'
          },
          body: JSON.stringify({
            amount: 0.2,
            walletAddress: userWithTon.wallet_address
          })
        });

        const result = await response.json();
        
        testResults[testResults.length - 1] = {
          test: 'Test 7: Withdraw TON to wallet',
          status: result.success ? 'PASS' : 'FAIL',
          details: `Wallet: ${userWithTon.wallet_address}, Response: ${JSON.stringify(result)}`
        };
      } else {
        testResults[testResults.length - 1] = {
          test: 'Test 7: Withdraw TON to wallet',
          status: 'SKIP',
          details: `TON balance: ${userWithTon?.ton_balance || 0}, Wallet: ${userWithTon?.wallet_address || 'Not connected'}`
        };
      }
    } catch (error) {
      testResults[testResults.length - 1] = {
        test: 'Test 7: Withdraw TON to wallet',
        status: 'ERROR',
        error: (error as Error).message
      };
    }

    // Summary
    const passedTests = testResults.filter(t => t.status === 'PASS').length;
    const failedTests = testResults.filter(t => t.status === 'FAIL').length;
    const errorTests = testResults.filter(t => t.status === 'ERROR').length;
    const skippedTests = testResults.filter(t => t.status === 'SKIP').length;

    return NextResponse.json({
      success: true,
      summary: {
        total: testResults.length,
        passed: passedTests,
        failed: failedTests,
        errors: errorTests,
        skipped: skippedTests
      },
      results: testResults
    });

  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

