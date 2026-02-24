/**
 * Database Migrations Runner
 * Executes and tracks database migrations on startup
 */
export interface Migration {
    name: string;
    up: (db: any) => void;
}
/**
 * Run all pending migrations
 */
export declare function runMigrations(): Promise<void>;
/**
 * Add a new migration
 * Usage: addMigration('add_new_table', (db) => { db.exec('CREATE TABLE...') })
 */
export declare function addMigration(name: string, upFn: (db: any) => void): void;
//# sourceMappingURL=migrations.d.ts.map