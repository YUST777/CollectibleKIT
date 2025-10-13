import { NextRequest, NextResponse } from 'next/server';
import { getUserFromTelegram } from '@/lib/telegram';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromTelegram(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get public collections
    const publicCollections = await db.getPublicCollections(limit, offset);
    
    // Get user's liked collections
    const userLikes = await db.getUserLikes(user.id);
    
    // Add liked status to each collection
    const collectionsWithLikes = publicCollections.map(collection => ({
      ...collection,
      isLikedByUser: userLikes.includes(collection.id)
    }));

    return NextResponse.json({ 
      collections: collectionsWithLikes,
      total: publicCollections.length 
    });

  } catch (error) {
    console.error('❌ Error loading public collections:', error);
    return NextResponse.json(
      { error: 'Failed to load public collections' },
      { status: 500 }
    );
  }
}

