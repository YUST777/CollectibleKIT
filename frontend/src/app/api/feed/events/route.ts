import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const events = await db.getFeedEvents(limit);

    return NextResponse.json({
      success: true,
      events,
      count: events.length,
    });
  } catch (error) {
    console.error('Error fetching feed events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feed events', details: (error as Error).message },
      { status: 500 }
    );
  }
}

