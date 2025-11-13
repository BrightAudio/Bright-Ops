// Quick test of Supabase query
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  console.log('Testing job query...');
  
  // Test 1: Select all columns
  const test1 = await supabase.from('jobs').select('*').limit(1);
  console.log('\nTest 1 - SELECT *:');
  console.log('Error:', test1.error);
  console.log('Data columns:', test1.data ? Object.keys(test1.data[0]) : 'none');
  
  // Test 2: Select specific columns
  const test2 = await supabase.from('jobs').select('id, code, title').limit(1);
  console.log('\nTest 2 - SELECT id, code, title:');
  console.log('Error:', test2.error);
  console.log('Data:', test2.data);
  
  // Test 3: Filter by code
  const test3 = await supabase.from('jobs').select('id, code, title').eq('code', '11112025').limit(1);
  console.log('\nTest 3 - SELECT with WHERE code=11112025:');
  console.log('Error:', test3.error);
  console.log('Data:', test3.data);
}

test().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
