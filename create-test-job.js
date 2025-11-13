// Create a test job with code JOB-1001
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function createTestJob() {
  console.log('Creating test job with code JOB-1001...');
  
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      code: 'JOB-1001',
      title: 'Test Job for Pull Sheet',
      status: 'in-process',
      client: 'Test Client'
    })
    .select();
  
  if (error) {
    console.error('Error creating job:', error);
  } else {
    console.log('✅ Job created successfully:', data);
  }
}

createTestJob().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
