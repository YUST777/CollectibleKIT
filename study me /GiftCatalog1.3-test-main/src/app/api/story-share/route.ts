import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

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

// Track story share and award points
export async function POST(request: NextRequest) {
  try {
    console.log('Story share API received request');
    const data = await request.json();
    console.log('Story share API request data:', data);
    
    const { userId, taskId, verify = false } = data;
    
    if (!userId) {
      console.log('Story share API error: Missing user_id');
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const pool = getUserDbPool();
    
    // Check if the user has already completed this task today
    const currentTaskId = taskId || new Date().toISOString().split('T')[0]; // Use provided taskId or today's date
    console.log(`Checking for task completion with userId=${userId}, taskId=${currentTaskId}`);
    
    const [existingTask] = await pool.execute(
      'SELECT id FROM user_tasks WHERE user_id = ? AND task_type = ? AND task_id = ?',
      [userId, 'story', currentTaskId]
    );
    
    // If task is already completed, just return success
    if ((existingTask as any[]).length > 0) {
      console.log('Task already completed');
      return NextResponse.json({ 
        success: false,
        message: 'Task already completed',
        alreadyCompleted: true
      });
    }
    
    // If this is just a verification request
    if (verify) {
      // Simplified verification - we'll just award points directly since the user clicked "Check"
      // In a real app, you might want to check story presence with the Telegram API
      
      // Start a transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // Add task completion record
        console.log('Adding task completion record');
        await connection.execute(
          'INSERT INTO user_tasks (user_id, task_type, task_id) VALUES (?, ?, ?)',
          [userId, 'story', currentTaskId]
        );
        
        // Award points (1 point for sharing story)
        console.log('Awarding points');
        await connection.execute(
          `INSERT INTO user_points (user_id, points) 
           VALUES (?, 1) 
           ON DUPLICATE KEY UPDATE points = points + 1`,
          [userId]
        );
        
        await connection.commit();
        
        console.log('Points awarded successfully');
        return NextResponse.json({ 
          success: true,
          message: 'Points awarded for sharing story'
        });
      } catch (error) {
        console.error('Error in transaction:', error);
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }
    
    // If we get here, this is just a notification about intent to share
    console.log('Recording intent to share');
    return NextResponse.json({ 
      success: true,
      message: 'Story share intent recorded',
      notShared: false
    });
    
  } catch (error) {
    console.error('Error processing story share:', error);
    return NextResponse.json({ 
      error: 'Failed to process story share', 
      details: (error as Error).message 
    }, { status: 500 });
  }
} 