import { NextRequest, NextResponse } from 'next/server';

// Using DuckDuckGo image search (no API key required)
// Alternative fallback if no API access is available

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

    // Use a simple image search aggregator or placeholder service
    // For now, we'll use placeholder images and suggest manual upload
    const searchQuery = encodeURIComponent(itemName);
    
    // Alternative: Use Pexels API (free, instant access, no waiting period)
    // Get free API key from: https://www.pexels.com/api/
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
    
    if (PEXELS_API_KEY) {
      const pexelsUrl = `https://api.pexels.com/v1/search?query=${searchQuery} audio equipment&per_page=5&orientation=landscape`;
      
      const response = await fetch(pexelsUrl, {
        headers: {
          'Authorization': PEXELS_API_KEY,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const images = data.photos?.map((photo: any) => ({
          url: photo.src.large,
          downloadUrl: photo.url,
          photographer: photo.photographer,
          photographerUrl: photo.photographer_url,
          unsplashUrl: photo.url,
        })) || [];

        return NextResponse.json({
          success: true,
          images,
          itemName,
          source: 'Pexels',
        });
      }
    }

    // Fallback: Return no results and suggest manual upload
    return NextResponse.json({
      success: true,
      images: [],
      itemName,
      source: 'None',
      message: 'Image search requires API key. Please upload image manually or add PEXELS_API_KEY to .env.local',
    });

  } catch (error) {
    console.error('Image search error:', error);
    return NextResponse.json({
      success: true,
      images: [],
      message: 'Image search unavailable. Please upload manually.',
    });
  }
}

// Track download (compatible with Pexels)
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

    // For Pexels, we don't need to track downloads explicitly
    // but we return success for compatibility
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Download tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track download' },
      { status: 500 }
    );
  }
}
