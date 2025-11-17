import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { searchItemPrice, searchMultipleItemPrices } from '@/lib/services/priceSearchService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemIds, itemNames, mode = 'search' } = body;

    // Validate request
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid itemIds array' },
        { status: 400 }
      );
    }

    if (mode === 'search' && (!itemNames || !Array.isArray(itemNames))) {
      return NextResponse.json(
        { error: 'Missing or invalid itemNames array for search mode' },
        { status: 400 }
      );
    }

    if (mode === 'search') {
      // Search for prices
      const prices = await searchMultipleItemPrices(itemNames);

      const results = itemIds.map((id, index) => ({
        itemId: id,
        name: itemNames[index],
        priceResult: prices[index],
      }));

      // Optionally save search results to database
      // This creates an audit trail of price searches
      const searchLog = {
        item_ids: itemIds,
        item_names: itemNames,
        results: results.map((r) => ({
          itemId: r.itemId,
          name: r.name,
          price: r.priceResult?.price,
          source: r.priceResult?.source,
          url: r.priceResult?.url,
          confidence: r.priceResult?.confidence,
        })),
        searched_at: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        results,
        searchLog,
      });
    } else if (mode === 'update') {
      // Update inventory with searched prices
      const { updates } = body;

      if (!updates || !Array.isArray(updates)) {
        return NextResponse.json(
          { error: 'Missing or invalid updates array' },
          { status: 400 }
        );
      }

      const updateResults = [];

      for (const update of updates) {
        const { itemId, marketValue, marketSource } = update;

        if (!itemId || marketValue === undefined) {
          updateResults.push({
            itemId,
            success: false,
            error: 'Missing itemId or marketValue',
          });
          continue;
        }

        // Update the inventory item with new market value
        const { data, error } = await supabase
          .from('inventory_items')
          .update({
            unit_value: marketValue,
            // Store market source in rental_notes or create new column
            rental_notes: `Market valued at ${marketValue} from ${marketSource} on ${new Date().toLocaleDateString()}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', itemId)
          .select();

        if (error) {
          updateResults.push({
            itemId,
            success: false,
            error: error.message,
          });
        } else {
          updateResults.push({
            itemId,
            success: true,
            data: data[0],
          });
        }
      }

      return NextResponse.json({
        success: true,
        updates: updateResults,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid mode. Use "search" or "update"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Inventory search error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // GET endpoint to check service status
  return NextResponse.json({
    status: 'ok',
    message: 'Inventory price search service is running',
    modes: ['search', 'update'],
    sources: ['Reverb.com', 'Sweetwater.com', 'B&H Photo'],
  });
}
