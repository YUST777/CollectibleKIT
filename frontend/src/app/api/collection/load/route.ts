import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Get user from Telegram WebApp data
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`📂 Loading collections for user ${user.id}`);
    
    // Get collections for this user from the database
    const userCollections = await db.getUserCollections(user.id);
    
    console.log(`✅ Found ${userCollections.length} collections for user ${user.id}`);
    
    return NextResponse.json({ collections: userCollections });

  } catch (error) {
    console.error('❌ Error loading collections:', error);
    return NextResponse.json(
      { error: 'Failed to load collections' },
      { status: 500 }
    );
  }
}
