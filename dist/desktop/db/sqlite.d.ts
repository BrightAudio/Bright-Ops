/**
 * SQLite Database Client for Desktop
 * Handles initialization, migrations, and queries
 */
import Database from 'better-sqlite3';
/**
 * Get or initialize database
 */
export declare function getDatabase(): Database.Database;
/**
 * Initialize database on first launch
 */
export declare function initializeDatabase(): Promise<void>;
/**
 * Close database connection
 */
export declare function closeDatabase(): void;
/**
 * Query builder for type safety (optional)
 */
export declare class Query<T> {
    private db;
    private sql;
    constructor(db: Database.Database, sql: string);
    run(params?: any): void;
    get(params?: any): T | undefined;
    all(params?: any): T[];
}
/**
 * Create prepared statement query
 */
export declare function query<T>(sql: string): Query<T>;
//# sourceMappingURL=sqlite.d.ts.map