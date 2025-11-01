import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getUserFromTelegram } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    // Get user from Telegram - check headers first for client-side requests
    let user = null;
    
    // Try to get init data from headers (for client-side fetch calls)
    const initData = request.headers.get('X-Telegram-Init-Data');
    if (initData) {
      const params = new URLSearchParams(initData);
      const userParam = params.get('user');
      if (userParam) {
        const userData = JSON.parse(decodeURIComponent(userParam));
        user = {
          id: userData.id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          username: userData.username,
          is_premium: userData.is_premium
        };
        console.log('📱 Got user from header:', user);
      }
    }
    
    // Fallback to regular method
    if (!user) {
      user = await getUserFromTelegram(request);
    }
    
    if (!user) {
      console.error('❌ No user authentication found');
      return NextResponse.json({ 
        success: false, 
        error: 'User not authenticated' 
      }, { status: 401 });
    }

    const userId = user.id;

    // Calculate expiration date (30 days from now)
    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days in milliseconds

    // Update user to premium
    const userData = await db.getUser(userId);
    
    if (!userData) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Update user type and premium expiration
    await db.updateUser(userId, { 
      user_type: 'premium',
      premium_expires_at: expiresAt
    });

    // Update Python tracker premium status
    try {
      const { spawn } = require('child_process');
      const pythonScript = '/root/01studio/CollectibleKIT/bot/ton_wallet_cli.py';
      
      // Set premium status in Python tracker
      const script = spawn('python3', [
        '-c',
        `
from daily_withdrawal_tracker import get_daily_withdrawal_tracker
from datetime import datetime, timedelta
import sys

tracker = get_daily_withdrawal_tracker()
tracker.set_user_premium_status(${userId}, True, datetime.now() + timedelta(days=30).isoformat())
print("SUCCESS: Premium status updated in Python tracker")
        `
      ], {
        cwd: '/root/01studio/CollectibleKIT/bot',
        env: { ...process.env }
      });

      script.on('close', (code: number | null) => {
        if (code === 0) {
          console.log('✅ Python tracker updated for user:', userId);
        } else {
          console.warn('⚠️ Failed to update Python tracker');
        }
      });
    } catch (error) {
      console.error('Error updating Python tracker:', error);
    }

    console.log('✅ User upgraded to premium:', userId, 'expires:', new Date(expiresAt).toISOString());

    return NextResponse.json({ 
      success: true, 
      message: 'Premium upgrade successful',
      user_id: userId 
    });
  } catch (error) {
    console.error('Error upgrading user to premium:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to upgrade user to premium' 
    }, { status: 500 });
  }
}
