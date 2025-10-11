import { type NextRequest, NextResponse } from 'next/server';
import { getStats } from '@/lib/db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    const { giftName } = params;
    const stats = await getStats(giftName);
    return NextResponse.json(stats);
  } catch (error) {
    console.error(`Error fetching stats for ${params.giftName}:`, error);

    if ((error as Error).message.includes('not found')) {
      return NextResponse.json(
        { error: `No database found for ${params.giftName}` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: `Failed to fetch stats for ${params.giftName}`, details: (error as Error).message },
      { status: 500 }
    );
  }
}
