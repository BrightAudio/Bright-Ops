/**
 * Base repository interface for repository pattern
 * Allows web and desktop to use different implementations
 */
export interface IRepository<T> {
    list(): Promise<T[]>;
    getById(id: string): Promise<T | null>;
    create(item: Omit<T, 'id'>): Promise<T>;
    update(id: string, changes: Partial<T>): Promise<T>;
    delete(id: string): Promise<boolean>;
}
/**
 * Environment detection
 */
export declare function isDesktop(): boolean;
/**
 * Runtime repository selector
 */
export declare function selectRepository<T>(webRepo: any, desktopRepo: any): any;
//# sourceMappingURL=base.d.ts.map