const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function addPullSheetItem() {
  console.log('Adding test item to pull sheet...\n');

  // First, get an inventory item
  const { data: items } = await supabase
    .from('inventory_items')
    .select('id, name, barcode')
    .limit(1);

  if (!items || items.length === 0) {
    console.log('No inventory items found');
    return;
  }

  const inventoryItem = items[0];
  console.log('Using inventory item:', inventoryItem.name);

  // Add item to pull sheet
  const { data: item, error } = await supabase
    .from('pull_sheet_items')
    .insert({
      pull_sheet_id: 'af633f2d-9ad8-4a96-8777-3fd6f537007d',
      inventory_item_id: inventoryItem.id,
      item_name: inventoryItem.name,
      barcode: inventoryItem.barcode,
      qty_requested: 1,
      qty_pulled: 0,
      qty_fulfilled: 0,
      prep_status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('\n✅ Pull sheet item added successfully!');
  console.log('Item ID:', item.id);
  console.log('Item Name:', item.item_name);
  console.log('Quantity Requested:', item.qty_requested);
  console.log('Prep Status:', item.prep_status);
}

addPullSheetItem();
