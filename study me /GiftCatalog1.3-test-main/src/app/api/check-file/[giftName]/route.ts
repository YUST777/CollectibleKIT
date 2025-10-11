import { type NextRequest, NextResponse } from 'next/server';
import { checkFile } from '@/lib/db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    const { giftName } = params;
    const exists = await checkFile(giftName);
    return NextResponse.json(exists);
  } catch (error) {
    console.error(`Error checking file for ${params.giftName}:`, error);
    return NextResponse.json(
      { error: `Failed to check file for ${params.giftName}`, details: (error as Error).message },
      { status: 500 }
    );
  }
}
