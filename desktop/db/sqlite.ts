/**
 * SQLite Database Client for Desktop
 * Handles initialization, migrations, and queries
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

let db: Database.Database | null = null;

/**
 * Get or initialize database
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Initialize database on first launch
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Get user data directory
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'bright-audio.db');

    // Initialize connection
    db = new Database(dbPath, { 
      verbose: console.log,  // Log SQL statements in development
      timeout: 5000 
    });

    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');

    console.log(`📦 Database initialized at: ${dbPath}`);

    // Run migrations
    await runMigrations();

    return;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Run database migrations
 */
async function runMigrations(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  try {
    // Check if schema exists
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as any[];

    if (tables.length === 0) {
      console.log('🔄 Running initial schema...');
      
      // Read schema file
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf-8');

      // Execute schema
      db.exec(schema);
      
      console.log('✅ Schema initialized');
    } else {
      console.log('✅ Schema already exists');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('🔌 Database closed');
  }
}

/**
 * Query builder for type safety (optional)
 */
export class Query<T> {
  constructor(private db: Database.Database, private sql: string) {}

  run(params?: any): void {
    const stmt = this.db.prepare(this.sql);
    stmt.run(params);
  }

  get(params?: any): T | undefined {
    const stmt = this.db.prepare(this.sql);
    return stmt.get(params) as T | undefined;
  }

  all(params?: any): T[] {
    const stmt = this.db.prepare(this.sql);
    return stmt.all(params) as T[];
  }
}

/**
 * Create prepared statement query
 */
export function query<T>(sql: string): Query<T> {
  const database = getDatabase();
  return new Query<T>(database, sql);
}
