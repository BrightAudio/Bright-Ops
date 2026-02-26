/**
 * Test the /api/sync/changes endpoint
 * Tests both successful and failed sync scenarios
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';

const execAsync = promisify(exec);

// Test configuration
const API_URL = 'http://localhost:3000/api/sync/changes';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'test-token';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  response?: Record<string, unknown>;
}

const results: TestResult[] = [];

async function testSyncEndpoint() {
  console.log('🧪 Testing /api/sync/changes endpoint\n');

  // Test 1: Empty changes array
  console.log('Test 1: Empty changes array');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({ changes: [] }),
    });

    const data = (await response.json()) as Record<string, unknown>;
    const passed = response.status === 200 && (data as any).synced === 0;

    results.push({
      name: 'Empty changes array',
      passed,
      response: data,
    });

    console.log(`  ${passed ? '✅' : '❌'} Status: ${response.status}, Synced: ${(data as any).synced}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({
      name: 'Empty changes array',
      passed: false,
      error: errorMsg,
    });
    console.log(`  ❌ Error: ${errorMsg}`);
  }

  console.log('');

  // Test 2: Invalid table name (should fail)
  console.log('Test 2: Invalid table name (security check)');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        changes: [
          {
            id: 'test-1',
            table_name: 'users',
            operation: 'INSERT',
            record_id: '123',
            new_values: { name: 'Test' },
            created_at: new Date().toISOString(),
          },
        ],
      }),
    });

    const data = (await response.json()) as Record<string, unknown>;
    const passed = response.status === 200 && (data as any).failed > 0;

    results.push({
      name: 'Invalid table name',
      passed,
      response: data,
    });

    console.log(`  ${passed ? '✅' : '❌'} Status: ${response.status}, Failed: ${(data as any).failed}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({
      name: 'Invalid table name',
      passed: false,
      error: errorMsg,
    });
    console.log(`  ❌ Error: ${errorMsg}`);
  }

  console.log('');

  // Test 3: Missing authorization (should fail)
  console.log('Test 3: Missing authorization header');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        changes: [
          {
            id: 'test-2',
            table_name: 'inventory_items',
            operation: 'UPDATE',
            record_id: '123',
            new_values: { qty_in_warehouse: 10 },
            created_at: new Date().toISOString(),
          },
        ],
      }),
    });

    const passed = response.status === 401;

    results.push({
      name: 'Missing authorization',
      passed,
    });

    console.log(`  ${passed ? '✅' : '❌'} Status: ${response.status} (expected 401)`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({
      name: 'Missing authorization',
      passed: false,
      error: errorMsg,
    });
    console.log(`  ❌ Error: ${errorMsg}`);
  }

  console.log('');

  // Test 4: Invalid JSON
  console.log('Test 4: Invalid request body');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: 'not valid json',
    });

    const passed = response.status === 400;

    results.push({
      name: 'Invalid JSON',
      passed,
    });

    console.log(`  ${passed ? '✅' : '❌'} Status: ${response.status} (expected 400)`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({
      name: 'Invalid JSON',
      passed: false,
      error: errorMsg,
    });
    console.log(`  ❌ Error: ${errorMsg}`);
  }

  console.log('');

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('📊 Test Summary');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  Total: ${results.length}`);

  if (failed > 0) {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

// Run tests
testSyncEndpoint().catch((error) => {
  console.error('Test suite error:', error);
  process.exit(1);
});
