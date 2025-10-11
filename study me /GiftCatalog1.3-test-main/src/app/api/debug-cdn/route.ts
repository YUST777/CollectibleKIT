import { NextRequest, NextResponse } from 'next/server';
import { mapCollectionNameToCdn, getCdnImageUrl } from '@/lib/utils';

// This endpoint helps diagnose CDN URL mapping issues
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const collection = searchParams.get('collection');
  const model = searchParams.get('model');
  
  if (!collection) {
    return NextResponse.json(
      { error: 'Collection name is required' },
      { status: 400 }
    );
  }

  // Create different mapping variations
  const mappedCollection = mapCollectionNameToCdn(collection);
  const modelToUse = model || 'Default';
  
  // Generate URL with our mapping
  const cdnUrl = getCdnImageUrl(collection, modelToUse);
  
  // Test if the URL is accessible
  let cdnStatus = 'unknown';
  try {
    const response = await fetch(cdnUrl, { method: 'HEAD' });
    cdnStatus = response.ok ? 'accessible' : `error (${response.status})`;
  } catch (error) {
    cdnStatus = `error (${error})`;
  }
  
  // Generate variations for debugging
  const variations = [
    { name: 'Original', value: collection },
    { name: 'Mapped', value: mappedCollection },
    { name: 'Lowercase', value: collection.toLowerCase() },
    { name: 'No Spaces', value: collection.replace(/\s+/g, '') },
    { name: 'Capitalized', value: collection
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    }
  ];
  
  // Create URLs for each variation
  const urlVariations = variations.map(v => ({
    name: v.name,
    collection: v.value,
    url: `https://cdn.changes.tg/gifts/models/${encodeURIComponent(v.value)}/png/${modelToUse}.png`
  }));
  
  return NextResponse.json({
    original: {
      collection,
      model: modelToUse,
    },
    mapped: {
      collection: mappedCollection,
      url: cdnUrl,
      status: cdnStatus
    },
    variations: urlVariations,
    recommendations: [
      'Ensure collection name matches the CDN folder structure',
      'Double-check model name from item attributes',
      'Verify absolute URLs are being used',
      'Check browser console for network errors',
    ]
  });
} 