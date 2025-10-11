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

// Get user points
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const pool = getUserDbPool();
    const [rows] = await pool.execute(
      'SELECT points FROM user_points WHERE user_id = ?',
      [userId]
    );
    
    const pointsData = (rows as any[])[0];
    const points = pointsData ? pointsData.points : 0;

    // Get completed tasks
    const [taskRows] = await pool.execute(
      'SELECT task_type, task_id FROM user_tasks WHERE user_id = ?',
      [userId]
    );
    
    const completedTasks = (taskRows as any[]).map(task => ({
      type: task.task_type,
      id: task.task_id
    }));

    return NextResponse.json({ 
      userId: Number(userId),
      points,
      completedTasks
    });
    
  } catch (error) {
    console.error('Error fetching user points:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch user points', 
      details: (error as Error).message 
    }, { status: 500 });
  }
} 