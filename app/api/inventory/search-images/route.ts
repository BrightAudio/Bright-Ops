import { NextRequest, NextResponse } from 'next/server';

// Unsplash API - free tier allows 50 requests per hour
// Guidelines: https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines
// - For non-automated, high-quality, authentic experiences
// - Must attribute photographers and track downloads
// - Keep access keys confidential
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || 'your-access-key-here';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemName } = body;

    if (!itemName) {
      return NextResponse.json(
        { error: 'Missing itemName' },
        { status: 400 }
      );
    }

    // Search Unsplash for product images
    const searchQuery = encodeURIComponent(itemName + ' professional audio equipment product');
    const unsplashUrl = `https://api.unsplash.com/search/photos?query=${searchQuery}&per_page=6&orientation=landscape`;

    const response = await fetch(unsplashUrl, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });

    if (!response.ok) {
      console.error('Unsplash API error:', response.statusText);
      return NextResponse.json(
        { error: 'Image search failed', details: response.statusText },
        { status: 500 }
      );
    }

    const data = await response.json();
    
    // Extract image URLs and attribution info from Unsplash response
    const images = data.results?.map((result: any) => ({
      url: result.urls.regular,
      downloadUrl: result.links.download_location, // Required for tracking
      photographer: result.user.name,
      photographerUrl: result.user.links.html,
      unsplashUrl: result.links.html,
    })) || [];

    return NextResponse.json({
      success: true,
      images: images.slice(0, 5), // Return top 5 results
      itemName,
      source: 'Unsplash',
      attribution: 'Photos from Unsplash',
    });
  } catch (error) {
    console.error('Image search error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Track download when user selects an image (required by Unsplash guidelines)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { downloadUrl } = body;

    if (!downloadUrl) {
      return NextResponse.json(
        { error: 'Missing downloadUrl' },
        { status: 400 }
      );
    }

    // Trigger download tracking endpoint (required by Unsplash)
    await fetch(downloadUrl, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Download tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track download' },
      { status: 500 }
    );
  }
}
