/**
 * Pull Sheet Repository Interface
 * Defines contract for pull sheet operations across web and desktop
 */

import { IRepository } from './base';

export interface PullSheetItem {
  id: string;
  pull_sheet_id: string;
  inventory_item_id: string;
  qty_needed: number;
  qty_checked_out: number;
  qty_returned: number;
  status: 'pending' | 'checked_out' | 'returned' | 'partial';
  created_at: string;
  updated_at: string;
}

export interface PullSheet {
  id: string;
  job_id?: string;
  venue_name?: string;
  event_date?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'returned';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  synced: boolean;
  items?: PullSheetItem[];
}

/**
 * Pull Sheet Repository Interface
 * Implement for both Supabase (web) and SQLite (desktop)
 */
export interface IPullSheetRepository extends IRepository<PullSheet> {
  /**
   * Get pull sheet with all line items
   */
  getByIdWithItems(id: string): Promise<PullSheet | null>;

  /**
   * Create new pull sheet
   */
  create(data: Omit<PullSheet, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<PullSheet>;

  /**
   * Update pull sheet metadata
   */
  update(id: string, changes: Partial<PullSheet>): Promise<PullSheet>;

  /**
   * Add item to pull sheet
   */
  addItem(pullSheetId: string, item: Omit<PullSheetItem, 'id' | 'created_at' | 'updated_at'>): Promise<PullSheetItem>;

  /**
   * Mark quantity of item checked out
   */
  checkoutItem(pullSheetId: string, itemId: string, qty: number): Promise<PullSheetItem>;

  /**
   * Mark quantity of item returned
   */
  returnItem(pullSheetId: string, itemId: string, qty: number): Promise<PullSheetItem>;

  /**
   * Get all pull sheets for a job
   */
  getByJobId(jobId: string): Promise<PullSheet[]>;

  /**
   * Get pull sheets by status
   */
  getByStatus(status: string): Promise<PullSheet[]>;

  /**
   * Get line item details
   */
  getItem(pullSheetId: string, itemId: string): Promise<PullSheetItem | null>;

  /**
   * Remove item from pull sheet
   */
  removeItem(pullSheetId: string, itemId: string): Promise<boolean>;
}
