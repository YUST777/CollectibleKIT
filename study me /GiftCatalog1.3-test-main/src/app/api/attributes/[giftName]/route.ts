import { type NextRequest, NextResponse } from 'next/server';
import { getAttributes } from '@/lib/db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    const { giftName } = params;
    const result = await getAttributes(giftName);
    return NextResponse.json(result);
  } catch (error) {
    console.error(`Error fetching attributes for ${params.giftName}:`, error);

    if ((error as Error).message.includes('not found')) {
      return NextResponse.json(
        { error: `No database found for ${params.giftName}` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: `Failed to fetch attributes for ${params.giftName}`, details: (error as Error).message },
      { status: 500 }
    );
  }
}
