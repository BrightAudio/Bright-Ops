import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates } = body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .select();

      if (error) {
        console.error(`Failed to update item ${itemId}:`, error);
        updateResults.push({
          itemId,
          success: false,
          error: error.message,
        });
      } else if (!data || data.length === 0) {
        console.error(`No item found with id ${itemId}`);
        updateResults.push({
          itemId,
          success: false,
          error: 'Item not found',
        });
      } else {
        console.log(`Successfully updated item ${itemId} with value ${marketValue} from ${marketSource}`);
        updateResults.push({
          itemId,
          success: true,
          data: data[0],
        });
      }
    }

    const successCount = updateResults.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      updated: successCount,
      total: updates.length,
      results: updateResults,
    });
  } catch (error) {
    console.error('Update values error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
