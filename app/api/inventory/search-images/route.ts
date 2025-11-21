// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Using Google Custom Search API for image search
// Get free API key from: https://developers.google.com/custom-search/v1/overview
// Create Custom Search Engine: https://programmablesearchengine.google.com/

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

    // Get Google API credentials
    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    
    if (!apiKey || !searchEngineId) {
      return NextResponse.json({
        success: false,
        error: 'Please configure GOOGLE_API_KEY and GOOGLE_SEARCH_ENGINE_ID in environment variables',
        images: [],
      });
    }
    
    return searchGoogle(itemName, apiKey, searchEngineId);

  } catch (error) {
    console.error('Image search error:', error);
    return NextResponse.json(
      { error: 'Failed to search images', images: [] },
      { status: 500 }
    );
  }
}

async function searchGoogle(itemName: string, apiKey: string, searchEngineId: string) {
  const searchQuery = encodeURIComponent(`${itemName} professional audio equipment`);
  
  // Use Google Custom Search API
  const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${searchQuery}&searchType=image&num=5&imgSize=large`;
  
  const response = await fetch(googleUrl);

  if (response.ok) {
    const data = await response.json();
    const images = data.items?.map((item: any) => ({
      url: item.link,
      downloadUrl: item.image?.contextLink || item.link,
      photographer: item.displayLink || 'Unknown',
      photographerUrl: item.image?.contextLink || '',
      unsplashUrl: item.link,
    })) || [];

    return NextResponse.json({
      success: true,
      images,
      itemName,
      source: 'Google Images',
    });
  }

  return NextResponse.json({
    success: false,
    error: 'Failed to search Google Images',
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
