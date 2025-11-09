import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { updateUserCredits, getUserByTelegramId, db } from '@/lib/database';
import { GiftDesign } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // Get user from Telegram WebApp data
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, designs, isPublic = false } = await request.json();

    if (!name || !designs || !Array.isArray(designs)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Check if user has enough credits (1 credit per save for normal users)
    const dbUser = await getUserByTelegramId(user.id);
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // VIP, Premium, and Test users can save for free
    const canSaveForFree = ['vip', 'premium', 'test'].includes(dbUser.user_type || 'normal');
    
    console.log('🔍 Save collection debug:', {
      userId: user.id,
      userType: dbUser.user_type,
      credits: dbUser.credits,
      canSaveForFree,
      fullUserData: dbUser
    });
    
    if (!canSaveForFree && dbUser.credits < 1) {
      return NextResponse.json({ 
        error: 'Insufficient credits', 
        message: 'You need 1 credit to save a collection. Please earn more credits first.' 
      }, { status: 400 });
    }

    // Deduct 1 credit for normal users
    if (!canSaveForFree) {
      const updatedCredits = await updateUserCredits(user.id, -1);
      if (updatedCredits === null) {
        return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 500 });
      }
    }

    // Create the saved collection
    const collectionId = `collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();

    // Save to database
    const saveSuccess = await db.saveCollection(collectionId, user.id, name, designs, createdAt, isPublic);
    
    if (!saveSuccess) {
      return NextResponse.json({ error: 'Failed to save collection to database' }, { status: 500 });
    }

    const savedCollection = {
      id: collectionId,
      name,
      designs,
      createdAt,
      userId: user.id,
    };

    console.log(`✅ Collection saved: ${name} by user ${user.id} (${dbUser.user_type})`);

    return NextResponse.json(savedCollection);

  } catch (error) {
    console.error('❌ Error saving collection:', error);
    return NextResponse.json(
      { error: 'Failed to save collection' },
      { status: 500 }
    );
  }
}

