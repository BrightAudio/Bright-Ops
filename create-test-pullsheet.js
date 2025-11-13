const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function createPullSheet() {
  console.log('Creating test pull sheet for JOB-1001...\n');

  // Insert pull sheet
  const { data: pullSheet, error: psError } = await supabase
    .from('pull_sheets')
    .insert({
      job_id: '858b3ce0-8f8c-4614-8f55-b2dce5b9cbb7', // JOB-1001 ID
      name: 'Test Pull Sheet for JOB-1001',
      status: 'pending',
      scheduled_out_at: new Date().toISOString(),
      expected_return_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    })
    .select()
    .single();

  if (psError) {
    console.error('❌ Error creating pull sheet:', psError);
    return;
  }

  console.log('✅ Pull sheet created successfully!');
  console.log('Pull Sheet ID:', pullSheet.id);
  console.log('Job ID:', pullSheet.job_id);
  console.log('Status:', pullSheet.status);
  console.log('Scheduled Out:', pullSheet.scheduled_out_at);
  console.log('Expected Return:', pullSheet.expected_return_at);
}

createPullSheet();
