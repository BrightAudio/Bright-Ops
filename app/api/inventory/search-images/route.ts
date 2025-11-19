import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Use ChatGPT to search for high-quality product images
    const prompt = `Find 5 high-quality, clear product images for: "${itemName}"

This is professional audio/video equipment. I need:
- Clear, professional product photos
- White or neutral backgrounds preferred
- Official product images or high-quality stock photos
- Images showing the full product clearly

Respond with ONLY a JSON array of image URLs (no other text):
["https://example.com/image1.jpg", "https://example.com/image2.jpg", ...]

If you cannot find suitable images, respond with an empty array: []`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at finding high-quality product images for professional audio and video equipment. You have access to search engines and image databases. Provide direct URLs to clear, professional product photos.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error');
      return NextResponse.json(
        { error: 'Image search failed' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    // Parse JSON from response
    let images: string[] = [];
    try {
      // Handle markdown code blocks
      let jsonStr = content;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      images = JSON.parse(jsonStr);
    } catch {
      // Try to extract JSON array
      const arrayMatch = content.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        images = JSON.parse(arrayMatch[0]);
      }
    }

    // Filter out invalid URLs
    const validImages = images.filter(url => {
      try {
        new URL(url);
        return url.startsWith('http://') || url.startsWith('https://');
      } catch {
        return false;
      }
    });

    return NextResponse.json({
      success: true,
      images: validImages,
      itemName,
    });
  } catch (error) {
    console.error('Image search error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
