const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testPullSheetQuery() {
  console.log('Testing pull sheet data fetch...\n');

  const pullSheetId = 'af633f2d-9ad8-4a96-8777-3fd6f537007d';

  // Test 1: Get pull sheet
  console.log('1. Fetching pull sheet...');
  const { data: ps, error: psError } = await supabase
    .from('pull_sheets')
    .select('id, code, name, status, created_at, finalized_at, scheduled_out_at, expected_return_at, job_id')
    .eq('id', pullSheetId)
    .single();
  
  if (psError) {
    console.error('Error:', psError);
    return;
  }
  console.log('✅ Pull sheet:', ps);

  // Test 2: Get job
  console.log('\n2. Fetching job...');
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, code, title, venue, start_at, end_at')
    .eq('id', ps.job_id)
    .single();
  
  if (jobError) {
    console.error('Error:', jobError);
  } else {
    console.log('✅ Job:', job);
  }

  // Test 3: Get items
  console.log('\n3. Fetching items...');
  const { data: items, error: itemsError } = await supabase
    .from('pull_sheet_items')
    .select('qty_requested, qty_pulled, item_name, barcode, category')
    .eq('pull_sheet_id', pullSheetId);
  
  if (itemsError) {
    console.error('Error:', itemsError);
  } else {
    console.log('✅ Items:', items);
  }
}

testPullSheetQuery();
