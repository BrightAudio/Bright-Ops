/**
 * Price Search Service (Client-side)
 * NOTE: Most pricing logic is now on the server in /api/inventory/price-search
 * This file is kept for reference/legacy compatibility
 */

interface PriceResult {
  item: string;
  price: number;
  source: string;
  url: string;
  lastUpdated: string;
  confidence: 'high' | 'medium' | 'low';
}

// Mock pricing database for common audio equipment
const COMMON_PRICES: { [key: string]: number } = {
  'jbl srx718': 2500,
  'jbl srx728s': 3200,
  'jbl srx726s': 2200,
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

/**
 * Search Reverb.com for audio equipment prices using direct HTML search
 * Reverb is the largest marketplace for audio equipment
 */
export async function searchReverbPrices(itemName: string): Promise<PriceResult | null> {
  try {
    const searchQuery = encodeURIComponent(itemName.toLowerCase().trim());
    const reverbUrl = `https://reverb.com/search?query=${searchQuery}&condition=all`;

    const response = await fetch(reverbUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Look for price patterns in HTML - Reverb stores prices as numbers
    // Pattern: "price":"2500" or price data in JSON-LD
    const priceMatches = html.match(/"price"\s*:\s*(\d+(?:\.\d{2})?)/g);
    
    if (!priceMatches || priceMatches.length === 0) {
      // Try alternative pattern
      const altPriceMatch = html.match(/\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
      if (!altPriceMatch) {
        return null;
      }
      const priceStr = altPriceMatch[1].replace(/,/g, '');
      const price = parseFloat(priceStr);
      if (isNaN(price)) return null;

      return {
        item: itemName,
        price,
        source: 'Reverb.com',
        url: reverbUrl,
        lastUpdated: new Date().toISOString(),
        confidence: 'medium',
      };
    }

    // Extract first price found
    const firstMatch = priceMatches[0];
    const priceStr = firstMatch.match(/(\d+(?:\.\d{2})?)/)?.[1];
    
    if (!priceStr) return null;

    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) return null;

    return {
      item: itemName,
      price,
      source: 'Reverb.com',
      url: reverbUrl,
      lastUpdated: new Date().toISOString(),
      confidence: 'high',
    };
  } catch (error) {
    console.error('Reverb search error:', error);
    return null;
  }
}

/**
 * Search Sweet Water for audio equipment
 * Popular retailer for pro audio equipment with current pricing
 */
export async function searchSweetwaterPrices(itemName: string): Promise<PriceResult | null> {
  try {
    // Sweetwater search - returns HTML that needs parsing
    const searchQuery = encodeURIComponent(itemName);
    const sweetwaterUrl = `https://www.sweetwater.com/store/search?s=${searchQuery}`;

    const response = await fetch(sweetwaterUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Parse price from HTML (basic regex - Sweetwater structure may vary)
    // Looking for pattern like "$999.99" or "Price: $1,299"
    const priceMatch = html.match(/\$[\d,]+\.?\d{0,2}/);
    if (!priceMatch) {
      return null;
    }

    const priceStr = priceMatch[0].replace(/[$,]/g, '');
    const price = parseFloat(priceStr);

    if (isNaN(price)) {
      return null;
    }

    return {
      item: itemName,
      price,
      source: 'Sweetwater.com',
      url: sweetwaterUrl,
      lastUpdated: new Date().toISOString(),
      confidence: 'medium',
    };
  } catch (error) {
    console.error('Sweetwater search error:', error);
    return null;
  }
}

/**
 * Search B&H Photo for audio equipment
 * Major retailer with consistent pricing
 */
export async function searchBHPhotoPrices(itemName: string): Promise<PriceResult | null> {
  try {
    const searchQuery = encodeURIComponent(itemName);
    const bhUrl = `https://www.bhphotovideo.com/c/search?Ntt=${searchQuery}&N=0`;

    const response = await fetch(bhUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Parse price from HTML
    const priceMatch = html.match(/\$[\d,]+\.?\d{0,2}/);
    if (!priceMatch) {
      return null;
    }

    const priceStr = priceMatch[0].replace(/[$,]/g, '');
    const price = parseFloat(priceStr);

    if (isNaN(price)) {
      return null;
    }

    return {
      item: itemName,
      price,
      source: 'B&H Photo',
      url: bhUrl,
      lastUpdated: new Date().toISOString(),
      confidence: 'medium',
    };
  } catch (error) {
    console.error('B&H Photo search error:', error);
    return null;
  }
}

/**
 * Main search function - tries multiple sources and returns best result
 * NOTE: This is legacy code. Use /api/inventory/price-search endpoint instead
 */
export async function searchItemPrice(itemName: string): Promise<PriceResult | null> {
  if (!itemName || itemName.trim().length === 0) {
    return null;
  }

  const trimmedName = itemName.toLowerCase().trim();

  // Try Reverb (most audio-equipment focused)
  const reverbResult = await searchReverbPrices(itemName);
  if (reverbResult) {
    return reverbResult;
  }

  // Try Sweetwater
  const sweetwaterResult = await searchSweetwaterPrices(itemName);
  if (sweetwaterResult) {
    return sweetwaterResult;
  }

  // Try B&H Photo
  const bhResult = await searchBHPhotoPrices(itemName);
  if (bhResult) {
    return bhResult;
  }

  // Fall back to local database with fuzzy matching
  const dbPrice = findPriceInDatabase(trimmedName);
  if (dbPrice) {
    return {
      item: itemName,
      price: dbPrice,
      source: 'Reference Database',
      url: 'https://bright-audio-app.com',
      lastUpdated: new Date().toISOString(),
      confidence: 'low',
    };
  }

  // All sources failed
  return null;
}

/**
 * Find price in local database using fuzzy matching
 */
function findPriceInDatabase(itemName: string): number | null {
  const lowerName = itemName.toLowerCase();

  // Exact match
  if (COMMON_PRICES[lowerName]) {
    return COMMON_PRICES[lowerName];
  }

  // Fuzzy match - check if item contains database keys
  for (const [key, price] of Object.entries(COMMON_PRICES)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return price;
    }
  }

  return null;
}

/**
 * Search multiple items in parallel
 */
export async function searchMultipleItemPrices(
  itemNames: string[]
): Promise<(PriceResult | null)[]> {
  const results = await Promise.all(
    itemNames.map((name) => searchItemPrice(name))
  );
  return results;
}
