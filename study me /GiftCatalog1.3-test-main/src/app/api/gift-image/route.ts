import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint that redirects to the gift image on CDN
 * 
 * This allows us to:
 * 1. Centralize the path construction logic
 * 2. Track image requests if needed
 * 3. Add any future caching or transformation logic
 * 4. Fallback to alternate URLs if needed
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const collection = searchParams.get('collection');
  const model = searchParams.get('model');
  
  // Validate required parameters
  if (!collection || !model) {
    return NextResponse.json(
      { error: 'Missing required parameters: collection and model' },
      { status: 400 }
    );
  }

  // Format collection name (capitalize first letter of each word)
  const formattedCollection = collection
    .trim()
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Construct CDN URL with proper encoding
  const cdnUrl = `https://cdn.changes.tg/gifts/models/${encodeURIComponent(formattedCollection)}/png/${encodeURIComponent(model)}.png`;
  
  console.log(`[API] Redirecting to CDN image: ${cdnUrl}`);
  
  // Check if the image exists at the CDN
  try {
    const response = await fetch(cdnUrl, { method: 'HEAD' });
    
    if (response.ok) {
      // Image exists, redirect to it
      return NextResponse.redirect(cdnUrl);
    }
    
    // If we get here, the image wasn't found at the CDN
    console.log(`[API] Image not found at CDN: ${cdnUrl}`);
    
    // Return 404 with helpful message
    return NextResponse.json(
      { 
        error: 'Gift image not found',
        requestedUrl: cdnUrl,
        tip: 'Check collection and model name spelling'
      },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error checking image at CDN:', error);
    
    // For any network errors, just redirect to the CDN URL
    // The client will handle the fallback if the image fails to load
    return NextResponse.redirect(cdnUrl);
  }
} 