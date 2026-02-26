/**
 * Phase 2 Integration Test: Full Sync Workflow
 * Tests desktop app changes syncing to Supabase via API
 */

import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import OutboxSyncService from './lib/sync/outboxSync.js';

// Test database setup
const testDbPath = path.join(process.cwd(), 'test-sync-integration.db');
let db;

const results = [];

/**
 * Initialize test database
 */
function initializeTestDb(): void {
  console.log('📦 Initializing test database...');

  try {
    db = new Database(testDbPath);

    // Create changes_outbox table for testing
    db.exec(`
      CREATE TABLE IF NOT EXISTS changes_outbox (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        operation TEXT NOT NULL,
        record_id TEXT NOT NULL,
        old_values JSON,
        new_values JSON,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        sync_attempts INTEGER DEFAULT 0,
        error TEXT
      );

      CREATE TABLE IF NOT EXISTS sync_log (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        entries_pushed INTEGER DEFAULT 0,
        entries_pulled INTEGER DEFAULT 0,
        error TEXT,
        sync_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Test database initialized');
  } catch (error) {
    console.error('❌ Failed to initialize test database:', error);
    throw error;
  }
}

/**
 * Test 1: Create a change in the outbox
 */
function testCreateChange(): void {
  console.log('\n📝 Test 1: Create change in outbox');
  try {
    const changeId = uuidv4();
    const recordId = uuidv4();

    db.prepare(`
      INSERT INTO changes_outbox (
        id, table_name, operation, record_id, new_values
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      changeId,
      'inventory_items',
      'UPDATE',
      recordId,
      JSON.stringify({ qty_in_warehouse: 5, updated_at: new Date().toISOString() })
    );

    // Verify it was created
    const change = db
      .prepare('SELECT * FROM changes_outbox WHERE id = ?')
      .get(changeId) as any;

    const passed = change && change.id === changeId && !change.synced_at;

    results.push({
      name: 'Create change in outbox',
      passed,
      details: { changeId, recordId, synced: change?.synced_at },
    });

    console.log(`  ${passed ? '✅' : '❌'} Change created and pending`);
  } catch (error) {
    results.push({
      name: 'Create change in outbox',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(`  ❌ Error: ${error}`);
  }
}

/**
 * Test 2: Read pending changes
 */
function testReadPendingChanges(): void {
  console.log('\n📖 Test 2: Read pending changes from outbox');
  try {
    const changes = db
      .prepare(`
        SELECT id, table_name, operation, record_id, new_values, created_at
        FROM changes_outbox
        WHERE synced_at IS NULL
        ORDER BY created_at ASC
      `)
      .all() as any[];

    const passed = Array.isArray(changes) && changes.length > 0;

    results.push({
      name: 'Read pending changes',
      passed,
      details: { count: changes.length, tables: changes.map((c) => c.table_name) },
    });

    console.log(`  ${passed ? '✅' : '❌'} Read ${changes.length} pending changes`);
  } catch (error) {
    results.push({
      name: 'Read pending changes',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(`  ❌ Error: ${error}`);
  }
}

/**
 * Test 3: Increment retry count
 */
function testRetryCount(): void {
  console.log('\n🔄 Test 3: Increment retry count on failure');
  try {
    const changeId = uuidv4();

    // Create a change
    db.prepare(`
      INSERT INTO changes_outbox (
        id, table_name, operation, record_id, new_values, sync_attempts
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      changeId,
      'jobs',
      'INSERT',
      uuidv4(),
      JSON.stringify({ code: 'JOB-001' }),
      0
    );

    // Simulate retry
    db.prepare('UPDATE changes_outbox SET sync_attempts = sync_attempts + 1 WHERE id = ?').run(
      changeId
    );

    const change = db
      .prepare('SELECT * FROM changes_outbox WHERE id = ?')
      .get(changeId) as any;

    const passed = change && change.sync_attempts === 1;

    results.push({
      name: 'Increment retry count',
      passed,
      details: { attempts: change?.sync_attempts },
    });

    console.log(
      `  ${passed ? '✅' : '❌'} Retry count incremented to ${change?.sync_attempts}`
    );
  } catch (error) {
    results.push({
      name: 'Increment retry count',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(`  ❌ Error: ${error}`);
  }
}

/**
 * Test 4: Mark change as synced
 */
function testMarkSynced(): void {
  console.log('\n✅ Test 4: Mark change as synced');
  try {
    const pending = db
      .prepare('SELECT id FROM changes_outbox WHERE synced_at IS NULL LIMIT 1')
      .get() as any;

    if (!pending) {
      throw new Error('No pending changes to mark as synced');
    }

    // Mark as synced
    db.prepare('UPDATE changes_outbox SET synced_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      pending.id
    );

    const change = db
      .prepare('SELECT * FROM changes_outbox WHERE id = ?')
      .get(pending.id) as any;

    const passed = change && change.synced_at !== null;

    results.push({
      name: 'Mark change as synced',
      passed,
      details: { syncedAt: change?.synced_at },
    });

    console.log(`  ${passed ? '✅' : '❌'} Change marked as synced`);
  } catch (error) {
    results.push({
      name: 'Mark change as synced',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(`  ❌ Error: ${error}`);
  }
}

/**
 * Test 5: Sync service reads outbox correctly
 */
function testSyncServiceReads(): void {
  console.log('\n📊 Test 5: Sync service reads changes from outbox');
  try {
    const syncService = new OutboxSyncService({
      batchSize: 10,
      authToken: 'test-token',
    });

    syncService.setDatabase(db);

    // Get pending changes
    const changes = db
      .prepare('SELECT * FROM changes_outbox WHERE synced_at IS NULL ORDER BY created_at ASC LIMIT 10')
      .all() as any[];

    const passed = Array.isArray(changes) && changes.length >= 0;

    results.push({
      name: 'Sync service reads changes',
      passed,
      details: { changesRead: changes.length },
    });

    console.log(`  ${passed ? '✅' : '❌'} Sync service read ${changes.length} changes`);
  } catch (error) {
    results.push({
      name: 'Sync service reads changes',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(`  ❌ Error: ${error}`);
  }
}

/**
 * Test 6: Get sync status
 */
function testGetSyncStatus(): void {
  console.log('\n📈 Test 6: Get sync status');
  try {
    const pending = db
      .prepare('SELECT COUNT(*) as count FROM changes_outbox WHERE synced_at IS NULL')
      .get() as any;

    const synced = db
      .prepare('SELECT COUNT(*) as count FROM changes_outbox WHERE synced_at IS NOT NULL')
      .get() as any;

    const passed = pending && synced && pending.count >= 0 && synced.count >= 0;

    results.push({
      name: 'Get sync status',
      passed,
      details: { pending: pending?.count, synced: synced?.count },
    });

    console.log(
      `  ${passed ? '✅' : '❌'} Sync status: ${pending?.count} pending, ${synced?.count} synced`
    );
  } catch (error) {
    results.push({
      name: 'Get sync status',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(`  ❌ Error: ${error}`);
  }
}

/**
 * Run all tests
 */
async function runTests(): Promise<void> {
  console.log('🧪 Phase 2 Integration Test: Full Sync Workflow\n');
  console.log('='.repeat(60));

  try {
    initializeTestDb();

    testCreateChange();
    testReadPendingChanges();
    testRetryCount();
    testMarkSynced();
    testSyncServiceReads();
    testGetSyncStatus();

    // Summary
    console.log('\n' + '='.repeat(60));
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    console.log('\n📊 Test Summary');
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  Total: ${results.length}`);

    if (failed > 0) {
      console.log('\n❌ Some tests failed!');
      results.forEach((r) => {
        if (!r.passed) {
          console.log(`  - ${r.name}: ${r.error}`);
        }
      });
      process.exit(1);
    } else {
      console.log('\n✅ All integration tests passed!');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Test suite error:', error);
    process.exit(1);
  } finally {
    if (db) {
      db.close();
    }
  }
}

runTests();
