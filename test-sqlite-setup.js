/**
 * Test SQLite Setup
 * Verifies that SQLite database initializes correctly with all tables
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Read the schema
const schemaPath = path.join(__dirname, 'desktop', 'db', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');

// Create test database
const testDbPath = path.join(__dirname, 'test-bright-audio.db');

// Clean up old test database
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

try {
  const db = new Database(testDbPath);
  console.log('✓ Database file created');

  // Split schema into individual statements
  const statements = schema.split(';').filter(stmt => stmt.trim());

  // Execute each statement
  for (const statement of statements) {
    db.exec(statement);
  }
  console.log('✓ Schema tables created');

  // Verify all tables exist
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log(`\n✓ Found ${tables.length} tables:`);
  tables.forEach(t => console.log(`  - ${t.name}`));

  // Test outbox table structure
  const outboxColumns = db.prepare(`PRAGMA table_info(changes_outbox)`).all();
  console.log(`\n✓ Outbox columns:`);
  outboxColumns.forEach(col => {
    console.log(`  - ${col.name}: ${col.type}`);
  });

  // Test inventory table structure
  const inventoryColumns = db.prepare(`PRAGMA table_info(inventory_items)`).all();
  console.log(`\n✓ Inventory columns:`);
  inventoryColumns.forEach(col => {
    console.log(`  - ${col.name}: ${col.type}`);
  });

  // Insert test item
  const testItem = {
    id: 'test-uuid-1',
    name: 'Test Speaker',
    category: 'Speakers',
    barcode: 'TEST123',
    qty_in_warehouse: 5,
    location: 'A1',
    unit_value: 500,
    purchase_cost: 300,
    purchase_date: new Date().toISOString(),
    maintenance_status: 'Good',
    repair_cost: 0,
    image_url: null,
    updated_at: new Date().toISOString(),
    synced: false
  };

  db.prepare(`
    INSERT INTO inventory_items (
      id, name, category, barcode, qty_in_warehouse, 
      location, unit_value, purchase_cost, purchase_date,
      maintenance_status, repair_cost, image_url, updated_at, synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    testItem.id, testItem.name, testItem.category, testItem.barcode, 
    testItem.qty_in_warehouse, testItem.location,
    testItem.unit_value, testItem.purchase_cost, testItem.purchase_date,
    testItem.maintenance_status, testItem.repair_cost, testItem.image_url,
    testItem.updated_at, 0  // false as integer
  );

  console.log('\n✓ Test item inserted');

  // Query it back
  const retrieved = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(testItem.id);
  console.log('✓ Test item retrieved:', retrieved.name, `(${retrieved.qty_in_warehouse} in stock)`);

  // Test outbox recording
  const changeId = 'change-uuid-1';
  db.prepare(`
    INSERT INTO changes_outbox (
      id, table_name, operation, record_id, old_values, new_values, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    changeId, 'inventory_items', 'INSERT', testItem.id,
    JSON.stringify({}),
    JSON.stringify(testItem),
    new Date().toISOString()
  );

  console.log('✓ Change recorded to outbox');

  // Verify schema_migrations table exists (for migrations)
  const migrationsCheck = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='schema_migrations'
  `).get();

  if (migrationsCheck) {
    console.log('✓ Migrations tracking table exists');
  }

  db.close();

  // Clean up test database
  fs.unlinkSync(testDbPath);

  console.log('\n✅ All SQLite setup tests passed!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
}
