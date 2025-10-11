import { type NextRequest, NextResponse } from 'next/server';
import { listExports } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const exports = await listExports();
    return NextResponse.json(exports);
  } catch (error) {
    console.error('Error listing exports:', error);
    return NextResponse.json(
      { error: 'Failed to list exports', details: (error as Error).message },
      { status: 500 }
    );
  }
}
