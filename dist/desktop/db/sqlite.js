"use strict";
/**
 * SQLite Database Client for Desktop
 * Handles initialization, migrations, and queries
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Query = void 0;
exports.getDatabase = getDatabase;
exports.initializeDatabase = initializeDatabase;
exports.closeDatabase = closeDatabase;
exports.query = query;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const electron_1 = require("electron");
let db = null;
/**
 * Get or initialize database
 */
function getDatabase() {
    if (!db) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return db;
}
/**
 * Initialize database on first launch
 */
async function initializeDatabase() {
    try {
        // Get user data directory
        const userDataPath = electron_1.app.getPath('userData');
        const dbPath = path_1.default.join(userDataPath, 'bright-audio.db');
        // Initialize connection
        db = new better_sqlite3_1.default(dbPath, {
            verbose: console.log, // Log SQL statements in development
            timeout: 5000
        });
        // Enable foreign keys
        db.pragma('foreign_keys = ON');
        db.pragma('journal_mode = WAL');
        console.log(`📦 Database initialized at: ${dbPath}`);
        // Run migrations
        await runMigrations();
        return;
    }
    catch (error) {
        console.error('❌ Failed to initialize database:', error);
        throw error;
    }
}
/**
 * Run database migrations
 */
async function runMigrations() {
    if (!db)
        throw new Error('Database not initialized');
    try {
        // Check if schema exists
        const tables = db
            .prepare("SELECT name FROM sqlite_master WHERE type='table'")
            .all();
        if (tables.length === 0) {
            console.log('🔄 Running initial schema...');
            // Read schema file
            const schemaPath = path_1.default.join(__dirname, '..', 'db', 'schema.sql');
            const schema = fs_1.default.readFileSync(schemaPath, 'utf-8');
            // Execute schema
            db.exec(schema);
            console.log('✅ Schema initialized');
        }
        else {
            console.log('✅ Schema already exists');
        }
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}
/**
 * Close database connection
 */
function closeDatabase() {
    if (db) {
        db.close();
        db = null;
        console.log('🔌 Database closed');
    }
}
/**
 * Query builder for type safety (optional)
 */
class Query {
    constructor(db, sql) {
        this.db = db;
        this.sql = sql;
    }
    run(params) {
        const stmt = this.db.prepare(this.sql);
        stmt.run(params);
    }
    get(params) {
        const stmt = this.db.prepare(this.sql);
        return stmt.get(params);
    }
    all(params) {
        const stmt = this.db.prepare(this.sql);
        return stmt.all(params);
    }
}
exports.Query = Query;
/**
 * Create prepared statement query
 */
function query(sql) {
    const database = getDatabase();
    return new Query(database, sql);
}
//# sourceMappingURL=sqlite.js.map