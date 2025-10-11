import { type NextRequest, NextResponse } from 'next/server';
import { getItems } from '@/lib/db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    const { giftName } = params;
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Number.parseInt(searchParams.get('limit') || '12');
    const sort = searchParams.get('sort') || 'id-asc';

    // Parse attributes if provided
    let attributes: Record<string, string[]> = {};
    const attributesParam = searchParams.get('attributes');
    if (attributesParam) {
      try {
        attributes = JSON.parse(attributesParam);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid attributes format', details: (error as Error).message },
          { status: 400 }
        );
      }
    }

    const result = await getItems(giftName, page, limit, sort, attributes);
    return NextResponse.json(result);
  } catch (error) {
    console.error(`Error fetching items for ${params.giftName}:`, error);

    if ((error as Error).message.includes('not found')) {
      return NextResponse.json(
        { error: `No database found for ${params.giftName}` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: `Failed to fetch items for ${params.giftName}`, details: (error as Error).message },
      { status: 500 }
    );
  }
}
