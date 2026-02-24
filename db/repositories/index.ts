/**
 * Repository Index
 * Central point for importing repositories in React components
 */

import { isDesktop } from './base';
import { IInventoryRepository } from './InventoryRepo';
import { InventorySupabaseRepository } from './InventorySupabaseRepository';
import { InventorySqliteRepository } from './InventorySqliteRepository';
import { IPullSheetRepository } from './PullSheetRepo';
import { PullSheetSupabaseRepository } from './PullSheetSupabaseRepository';
import { PullSheetSqliteRepository } from './PullSheetSqliteRepository';

// Singleton instances
let inventoryRepo: IInventoryRepository;
let pullSheetRepo: IPullSheetRepository;

/**
 * Get inventory repository (web or desktop)
 */
export function getInventoryRepository(): IInventoryRepository {
  if (!inventoryRepo) {
    if (isDesktop()) {
      inventoryRepo = new InventorySqliteRepository();
    } else {
      inventoryRepo = new InventorySupabaseRepository();
    }
  }
  return inventoryRepo;
}

/**
 * Get pull sheet repository (web or desktop)
 */
export function getPullSheetRepository(): IPullSheetRepository {
  if (!pullSheetRepo) {
    if (isDesktop()) {
      pullSheetRepo = new PullSheetSqliteRepository();
    } else {
      pullSheetRepo = new PullSheetSupabaseRepository();
    }
  }
  return pullSheetRepo;
}

// Export all repository types and implementations
export type { IInventoryRepository, InventoryItem } from './InventoryRepo';
export type { IPullSheetRepository, PullSheet, PullSheetItem } from './PullSheetRepo';
export { InventorySupabaseRepository } from './InventorySupabaseRepository';
export { InventorySqliteRepository } from './InventorySqliteRepository';
export { PullSheetSupabaseRepository } from './PullSheetSupabaseRepository';
export { PullSheetSqliteRepository } from './PullSheetSqliteRepository';
