import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import axios from 'axios';

const GIFT_CATALOG_CHANNEL_ID = -1002658162089;
const TWE_CHANNEL_ID = -1002180550939;

// Telegram Bot Token - use either BOT_TOKEN or TELEGRAM_BOT_TOKEN
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;

// Function to get MySQL connection for user data
const getUserDbPool = () => {
  const dbConfig = {
    host: process.env.MYSQL_REF_HOST,
    port: Number.parseInt(process.env.MYSQL_REF_PORT || '3306'),
    user: process.env.MYSQL_REF_USER,
    password: process.env.MYSQL_REF_PASSWORD,
    database: process.env.MYSQL_REF_DATABASE,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
  return mysql.createPool(dbConfig);
};

// Check if user is in channel by calling Telegram API directly
async function checkChannelMembership(userId: number, channelId: string): Promise<boolean> {
  try {
    if (!BOT_TOKEN) {
      console.error('No Telegram bot token found in environment variables');
      return false;
    }

    // For testing purposes, always return true to test the points system
    // Remove this line in production
    if (process.env.NODE_ENV === 'development') {
      console.log('DEV MODE: Bypassing Telegram API check, assuming user is a member');
      console.log('To test actual API calls, set NODE_ENV=production in .env file');
      return true;
    }

    const chatId = channelId.startsWith('@') ? channelId : channelId;
    const response = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${userId}`
    );

    if (response.data.ok) {
      const status = response.data.result.status;
      return ['member', 'administrator', 'creator'].includes(status);
    }
    
    return false;
  } catch (error) {
    console.error('Error checking channel membership via Telegram API:', error);
    return false;
  }
}

// Check if user is in channel - now with real Telegram API verification
export async function POST(request: NextRequest) {
  try {
    const { userId, channelId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Check if this task is already completed
    const pool = getUserDbPool();
    const [rows] = await pool.execute(
      'SELECT * FROM user_tasks WHERE user_id = ? AND task_type = ? AND task_id = ?',
      [userId, 'channel', channelId]
    );
    
    const taskCompleted = (rows as any[]).length > 0;
    
    if (taskCompleted) {
      return NextResponse.json({ 
        success: true, 
        isMember: true, 
        alreadyRewarded: true,
        message: 'Already completed this task'
      });
    }

    // Verify channel membership with Telegram API
    const isMember = await checkChannelMembership(userId, channelId);

    if (!isMember) {
      return NextResponse.json({
        success: false,
        isMember: false,
        message: 'User is not a member of the channel'
      });
    }

    // Record task completion and award points
    await pool.execute(
      'INSERT INTO user_tasks (user_id, task_type, task_id, points_awarded, completed_at) VALUES (?, ?, ?, ?, NOW())',
      [userId, 'channel', channelId, 1]
    );
    
    // Update user's points balance
    await pool.execute(
      'INSERT INTO user_points (user_id, points, updated_at) VALUES (?, 1, NOW()) ON DUPLICATE KEY UPDATE points = points + 1, updated_at = NOW()',
      [userId]
    );

    return NextResponse.json({ 
      success: true, 
      isMember: true, 
      pointsAwarded: 1,
      message: 'Channel membership confirmed and points awarded'
    });
    
  } catch (error) {
    console.error('Error checking channel membership:', error);
    return NextResponse.json({ 
      error: 'Failed to verify channel membership', 
      details: (error as Error).message 
    }, { status: 500 });
  }
} 