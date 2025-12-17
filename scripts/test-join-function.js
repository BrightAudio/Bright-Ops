/**
 * Test script to verify join_warehouse_with_pin function exists in Supabase
 * Run with: node scripts/test-join-function.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testJoinFunction() {
  console.log('🔍 Testing join_warehouse_with_pin function...\n');

  // Test 1: Check if function exists by calling it with invalid params
  console.log('Test 1: Checking if function exists...');
  const { data, error } = await supabase.rpc('join_warehouse_with_pin', {
    p_warehouse_name: '__test_nonexistent__',
    p_pin: '__test__'
  });

  if (error) {
    if (error.message?.includes('does not exist') || error.message?.includes('function')) {
      console.error('❌ FUNCTION NOT FOUND');
      console.error('Error:', error.message);
      console.log('\n📋 Action Required:');
      console.log('   Run this migration in Supabase SQL Editor:');
      console.log('   sql/migrations/2025-12-12_warehouse_access_control.sql\n');
      return false;
    } else {
      // Function exists but returned an error (expected with test params)
      console.log('✅ Function exists (returned expected error for test params)');
    }
  }

  if (data) {
    console.log('Response:', data);
    if (Array.isArray(data) && data.length > 0 && 'success' in data[0]) {
      console.log('✅ Function structure is correct');
    }
  }

  // Test 2: Check warehouses table has PIN column
  console.log('\nTest 2: Checking warehouses table...');
  const { data: warehouses, error: warehouseError } = await supabase
    .from('warehouses')
    .select('id, name, pin')
    .limit(1);

  if (warehouseError) {
    if (warehouseError.message?.includes('column') && warehouseError.message?.includes('pin')) {
      console.error('❌ PIN column missing from warehouses table');
      console.log('   Run the warehouse_access_control migration first\n');
      return false;
    } else {
      console.error('❌ Error accessing warehouses:', warehouseError.message);
      return false;
    }
  }

  console.log('✅ Warehouses table has PIN column');
  if (warehouses && warehouses.length > 0) {
    console.log(`   Found ${warehouses.length} warehouse(s)`);
    warehouses.forEach(w => {
      console.log(`   - ${w.name} (PIN: ${w.pin ? '✓ set' : '✗ not set'})`);
    });
  }

  // Test 3: Check user_warehouse_access table
  console.log('\nTest 3: Checking user_warehouse_access table...');
  const { error: accessError } = await supabase
    .from('user_warehouse_access')
    .select('count')
    .limit(1);

  if (accessError) {
    if (accessError.message?.includes('does not exist')) {
      console.error('❌ user_warehouse_access table does not exist');
      console.log('   Run the warehouse_access_control migration\n');
      return false;
    } else {
      console.error('❌ Error accessing user_warehouse_access:', accessError.message);
      return false;
    }
  }

  console.log('✅ user_warehouse_access table exists');

  console.log('\n✅ All checks passed!');
  console.log('   The join_warehouse_with_pin function should work correctly.\n');
  return true;
}

// Run the test
testJoinFunction()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  });
