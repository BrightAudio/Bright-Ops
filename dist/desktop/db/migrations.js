"use strict";
/**
 * Database Migrations Runner
 * Executes and tracks database migrations on startup
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
exports.addMigration = addMigration;
const sqlite_1 = require("./sqlite");
const MIGRATIONS_TABLE = 'schema_migrations';
/**
 * Initialize migrations tracking table
 */
function initMigrationsTable(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
/**
 * Get list of applied migrations
 */
function getAppliedMigrations(db) {
    try {
        const result = db
            .prepare(`SELECT name FROM ${MIGRATIONS_TABLE}`)
            .all();
        return result.map((row) => row.name);
    }
    catch {
        return [];
    }
}
/**
 * Mark migration as applied
 */
function recordMigration(db, name) {
    db.prepare(`INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES (?)`).run(name);
}
/**
 * Run all pending migrations
 */
async function runMigrations() {
    try {
        const db = (0, sqlite_1.getDatabase)();
        console.log('🔄 Running migrations...');
        // Initialize migrations table
        initMigrationsTable(db);
        // Get already applied migrations
        const applied = getAppliedMigrations(db);
        // Define migrations inline
        const migrations = [
            {
                name: '001_initial_schema',
                up: (database) => {
                    // This is already handled by schema.sql on first launch
                    // But we track it here for future migrations
                    console.log('   ✅ Initial schema (loaded from schema.sql)');
                },
            },
        ];
        // Run pending migrations
        let count = 0;
        for (const migration of migrations) {
            if (!applied.includes(migration.name)) {
                console.log(`   📦 Running: ${migration.name}`);
                migration.up(db);
                recordMigration(db, migration.name);
                count++;
            }
        }
        if (count === 0) {
            console.log('   ✅ All migrations already applied');
        }
        else {
            console.log(`✅ ${count} migrations applied`);
        }
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}
/**
 * Add a new migration
 * Usage: addMigration('add_new_table', (db) => { db.exec('CREATE TABLE...') })
 */
function addMigration(name, upFn) {
    const db = (0, sqlite_1.getDatabase)();
    // Check if already applied
    const applied = getAppliedMigrations(db);
    if (applied.includes(name)) {
        console.log(`⚠️  Migration ${name} already applied`);
        return;
    }
    console.log(`📦 Running: ${name}`);
    upFn(db);
    recordMigration(db, name);
    console.log(`✅ Migration ${name} applied`);
}
//# sourceMappingURL=migrations.js.map