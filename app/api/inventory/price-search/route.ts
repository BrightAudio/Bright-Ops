import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Common audio equipment pricing database
const COMMON_PRICES: { [key: string]: number } = {
  'jbl srx718': 2500,
  'jbl srx728s': 3200,
  'jbl srx726s': 2200,
  'jbl srx712m': 1800,
  'shure sm7b': 399,
  'shure sm58': 99,
  'shure beta58': 129,
  'yamaha ql1': 5995,
  'yamaha tio1608': 2995,
  'behringer x32': 2495,
  'allen heath qu32': 4995,
  'pioneer cdj-3000': 2795,
  'd&b audiotechnik': 1800,
  'meyer sound': 3500,
  'line array': 4200,
  'powered speaker': 1200,
  'subwoofer': 1500,
};

function findPriceInDatabase(itemName: string): number | null {
  const lowerName = itemName.toLowerCase().trim();

  // Exact match
  if (COMMON_PRICES[lowerName]) {
    return COMMON_PRICES[lowerName];
  }

  // Fuzzy match
  for (const [key, price] of Object.entries(COMMON_PRICES)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return price;
    }
  }

  return null;
}

async function searchWithChatGPT(itemName: string): Promise<{ price: number | null; source: string | null }> {
  if (!OPENAI_API_KEY) {
    return null;
  }

  try {
    const prompt = `You are an audio equipment pricing expert with access to current market data. Find pricing for: "${itemName}"

Search these sources in order:
1. eBay SOLD listings (highest sold price for good/excellent condition)
2. eBay ACTIVE listings (current asking prices)
3. Facebook Marketplace (recent listings)
4. Reverb.com, Sweetwater, Guitar Center

Provide the BEST/HIGHEST price you find and specify which source.

Respond with ONLY a JSON object (no other text):
{"price": <number only>, "source": "<source name>"}

Example: {"price": 2500, "source": "eBay Sold Listing"}

If you cannot determine a price, respond: {"price": null, "source": null}`;

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
            content: 'You are an expert in professional audio equipment pricing with access to eBay (sold and active listings), Facebook Marketplace, Reverb, and other music gear marketplaces. Provide accurate market prices for used equipment in good/excellent condition.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error');
      return null;
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    // Parse JSON from response
    let priceData;
    try {
      // Handle markdown code blocks
      let jsonStr = content;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      priceData = JSON.parse(jsonStr);
    } catch {
      // Try to extract JSON object
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }
      priceData = JSON.parse(jsonMatch[0]);
    }

    const price = priceData.price;
    const source = priceData.source;
    if (!price || price <= 0) {
      return { price: null, source: null };
    }

    return { price, source: source || 'ChatGPT Analysis' };
  } catch (error) {
    console.error('ChatGPT pricing error:', error);
    return { price: null, source: null };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemIds, itemNames } = body;

    if (!itemIds || !Array.isArray(itemIds) || !itemNames || !Array.isArray(itemNames)) {
      return NextResponse.json(
        { error: 'Missing itemIds or itemNames' },
        { status: 400 }
      );
    }

    const results = [];

    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i];
      const itemName = itemNames[i];

      if (!itemName) {
        results.push({
          itemId,
          name: itemName,
          price: null,
          source: null,
          confidence: null,
        });
        continue;
      }

      // Try ChatGPT first
      const chatGPTResult = await searchWithChatGPT(itemName);
      let price = chatGPTResult.price;
      let source = chatGPTResult.source || 'Market Search';
      let confidence = 'high';

      // Fall back to database
      if (!price) {
        price = findPriceInDatabase(itemName);
        source = 'Reference Database';
        confidence = 'low';
      }

      results.push({
        itemId,
        name: itemName,
        price,
        source: price ? source : null,
        confidence: price ? confidence : null,
      });
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Price search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
