import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Get all available gift collection names
 * Returns an array of gift names from cdn_links.json
 */
export async function GET() {
  try {
    // Read from public/cdn_links.json
    const filePath = path.join(process.cwd(), 'public', 'cdn_links.json');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    // Extract gift names from the gifts array
    const giftNames = (data.gifts || []).map((gift: any) => gift.name);
    
    return NextResponse.json({
      success: true,
      gifts: giftNames
    });
  } catch (error) {
    console.error('Error loading gifts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load gifts' },
      { status: 500 }
    );
  }
}

