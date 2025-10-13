import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { db } from '@/lib/database';

export async function DELETE(request: NextRequest) {
  try {
    // Get user from Telegram WebApp data
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { collectionId } = await request.json();
    
    if (!collectionId) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
    }

    console.log(`🗑️ Deleting collection ${collectionId} for user ${user.id}`);
    
    // Delete collection from database
    const deleteSuccess = await db.deleteCollection(collectionId, user.id);
    
    if (!deleteSuccess) {
      return NextResponse.json({ error: 'Failed to delete collection' }, { status: 500 });
    }
    
    console.log(`✅ Collection ${collectionId} deleted for user ${user.id}`);
    
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Error deleting collection:', error);
    return NextResponse.json(
      { error: 'Failed to delete collection' },
      { status: 500 }
    );
  }
}

