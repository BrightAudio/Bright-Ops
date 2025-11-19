import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Using Pexels API for image search (free, instant access)
// Users can configure their API key in Settings > Account > API Keys

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

    // Get user's Pexels API key from database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      // Fallback to env variable for backward compatibility
      const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
      if (!PEXELS_API_KEY) {
        return NextResponse.json({
          success: false,
          error: 'Please configure your Pexels API key in Settings > Account > API Keys',
          images: [],
        });
      }
      return searchPexels(itemName, PEXELS_API_KEY);
    }

    // Get user ID from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      // Fallback to env variable
      const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
      if (!PEXELS_API_KEY) {
        return NextResponse.json({
          success: false,
          error: 'Please configure your Pexels API key in Settings > Account > API Keys',
          images: [],
        });
      }
      return searchPexels(itemName, PEXELS_API_KEY);
    }

    // Get user's API key from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('pexels_api_key')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.pexels_api_key) {
      // Fallback to env variable
      const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
      if (!PEXELS_API_KEY) {
        return NextResponse.json({
          success: false,
          error: 'Please configure your Pexels API key in Settings > Account > API Keys',
          images: [],
        });
      }
      return searchPexels(itemName, PEXELS_API_KEY);
    }

    return searchPexels(itemName, profile.pexels_api_key);

  } catch (error) {
    console.error('Image search error:', error);
    return NextResponse.json(
      { error: 'Failed to search images', images: [] },
      { status: 500 }
    );
  }
}

async function searchPexels(itemName: string, apiKey: string) {
  const searchQuery = encodeURIComponent(itemName);
  
  // Use Pexels API (free, instant access, no waiting period)
  const pexelsUrl = `https://api.pexels.com/v1/search?query=${searchQuery} audio equipment&per_page=5&orientation=landscape`;
  
  const response = await fetch(pexelsUrl, {
    headers: {
      'Authorization': apiKey,
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

  return NextResponse.json({
    success: false,
    error: 'Failed to search Pexels',
    images: [],
  });
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
