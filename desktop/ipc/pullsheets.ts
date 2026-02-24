/**
 * Pull Sheet IPC Handlers
 * Handle pull sheet operations from React via IPC
 */

import { ipcMain } from 'electron';
import { getDatabase } from '../db/sqlite';
import { v4 as uuidv4 } from 'uuid';

export type PullSheet = {
  id: string;
  name: string;
  code: string;
  job_id: string | null;
  status: string;
  scheduled_out_at: string | null;
  expected_return_at: string | null;
  created_at: string;
  updated_at: string;
  synced: boolean;
};

export type PullSheetItem = {
  id: string;
  pull_sheet_id: string;
  inventory_item_id: string;
  qty_requested: number;
  qty_checked_out: number;
  qty_returned: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  synced: boolean;
};

/**
 * Register all pull sheet handlers
 */
export function registerPullSheetHandlers(): void {
  console.log('📋 Registering pull sheet IPC handlers...');

  /**
   * List all pull sheets
   */
  ipcMain.handle('pullsheets:list', async () => {
    try {
      const db = getDatabase();
      const sheets = db
        .prepare('SELECT * FROM pull_sheets ORDER BY created_at DESC')
        .all() as PullSheet[];
      return { success: true, data: sheets };
    } catch (error) {
      console.error('Error listing pull sheets:', error);
      return { success: false, error: (error as any).message };
    }
  });

  /**
   * Get pull sheet by ID with items
   */
  ipcMain.handle('pullsheets:getById', async (_event, id: string) => {
    try {
      const db = getDatabase();

      const sheet = db
        .prepare('SELECT * FROM pull_sheets WHERE id = ?')
        .get(id) as PullSheet | undefined;

      if (!sheet) {
        return { success: false, error: 'Pull sheet not found' };
      }

      const items = db
        .prepare('SELECT * FROM pull_sheet_items WHERE pull_sheet_id = ? ORDER BY created_at')
        .all(id) as PullSheetItem[];

      return { success: true, data: { sheet, items } };
    } catch (error) {
      console.error('Error getting pull sheet:', error);
      return { success: false, error: (error as any).message };
    }
  });

  /**
   * Create new pull sheet
   */
  ipcMain.handle(
    'pullsheets:create',
    async (_event, data: Omit<PullSheet, 'id' | 'created_at' | 'updated_at' | 'synced'>) => {
      try {
        const db = getDatabase();
        const id = uuidv4();
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO pull_sheets (
            id, name, code, job_id, status, scheduled_out_at, expected_return_at, created_at, updated_at, synced
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `).run(
          id,
          data.name,
          data.code,
          data.job_id || null,
          data.status || 'draft',
          data.scheduled_out_at || null,
          data.expected_return_at || null,
          now,
          now
        );

        recordChange('pull_sheets', 'INSERT', id, null, { ...data, id });

        const created = db
          .prepare('SELECT * FROM pull_sheets WHERE id = ?')
          .get(id) as PullSheet;

        return { success: true, data: created };
      } catch (error) {
        console.error('Error creating pull sheet:', error);
        return { success: false, error: (error as any).message };
      }
    }
  );

  /**
   * Update pull sheet
   */
  ipcMain.handle('pullsheets:update', async (_event, id: string, changes: Partial<PullSheet>) => {
    try {
      const db = getDatabase();

      const oldSheet = db
        .prepare('SELECT * FROM pull_sheets WHERE id = ?')
        .get(id) as PullSheet | undefined;

      if (!oldSheet) {
        return { success: false, error: 'Pull sheet not found' };
      }

      const now = new Date().toISOString();
      const updateFields = { ...changes, updated_at: now };

      const fields = Object.keys(updateFields)
        .map((k) => `${k} = ?`)
        .join(', ');
      const values = [...Object.values(updateFields), id];

      db.prepare(`UPDATE pull_sheets SET ${fields} WHERE id = ?`).run(...values);

      recordChange('pull_sheets', 'UPDATE', id, oldSheet, updateFields);

      const updated = db
        .prepare('SELECT * FROM pull_sheets WHERE id = ?')
        .get(id) as PullSheet;

      return { success: true, data: updated };
    } catch (error) {
      console.error('Error updating pull sheet:', error);
      return { success: false, error: (error as any).message };
    }
  });

  /**
   * Add item to pull sheet
   */
  ipcMain.handle(
    'pullsheets:addItem',
    async (
      _event,
      pullSheetId: string,
      data: Omit<
        PullSheetItem,
        'id' | 'pull_sheet_id' | 'qty_checked_out' | 'qty_returned' | 'created_at' | 'updated_at' | 'synced'
      >
    ) => {
      try {
        const db = getDatabase();
        const id = uuidv4();
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO pull_sheet_items (
            id, pull_sheet_id, inventory_item_id, qty_requested, qty_checked_out,
            qty_returned, status, notes, created_at, updated_at, synced
          ) VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?, 0)
        `).run(
          id,
          pullSheetId,
          data.inventory_item_id,
          data.qty_requested || 0,
          data.status || 'pending',
          data.notes || null,
          now,
          now
        );

        recordChange('pull_sheet_items', 'INSERT', id, null, {
          ...data,
          id,
          pull_sheet_id: pullSheetId,
        });

        const item = db
          .prepare('SELECT * FROM pull_sheet_items WHERE id = ?')
          .get(id) as PullSheetItem;

        return { success: true, data: item };
      } catch (error) {
        console.error('Error adding item to pull sheet:', error);
        return { success: false, error: (error as any).message };
      }
    }
  );

  /**
   * Checkout item from pull sheet (mark qty_checked_out)
   */
  ipcMain.handle(
    'pullsheets:checkoutItem',
    async (_event, pullSheetId: string, itemId: string, qty: number) => {
      try {
        const db = getDatabase();

        const item = db
          .prepare(
            'SELECT * FROM pull_sheet_items WHERE pull_sheet_id = ? AND inventory_item_id = ?'
          )
          .get(pullSheetId, itemId) as PullSheetItem | undefined;

        if (!item) {
          return { success: false, error: 'Item not found in pull sheet' };
        }

        const now = new Date().toISOString();
        const newQty = Math.min(item.qty_requested, item.qty_checked_out + qty);

        db.prepare(
          `UPDATE pull_sheet_items SET qty_checked_out = ?, status = ?, updated_at = ? 
           WHERE pull_sheet_id = ? AND inventory_item_id = ?`
        ).run('checked_out', now, pullSheetId, itemId, newQty);

        recordChange('pull_sheet_items', 'UPDATE', item.id, item, {
          qty_checked_out: newQty,
          status: 'checked_out',
          updated_at: now,
        });

        const updated = db
          .prepare(
            'SELECT * FROM pull_sheet_items WHERE pull_sheet_id = ? AND inventory_item_id = ?'
          )
          .get(pullSheetId, itemId) as PullSheetItem;

        return { success: true, data: updated };
      } catch (error) {
        console.error('Error checking out item:', error);
        return { success: false, error: (error as any).message };
      }
    }
  );

  /**
   * Return item to pull sheet
   */
  ipcMain.handle(
    'pullsheets:returnItem',
    async (_event, pullSheetId: string, itemId: string, qty: number) => {
      try {
        const db = getDatabase();

        const item = db
          .prepare(
            'SELECT * FROM pull_sheet_items WHERE pull_sheet_id = ? AND inventory_item_id = ?'
          )
          .get(pullSheetId, itemId) as PullSheetItem | undefined;

        if (!item) {
          return { success: false, error: 'Item not found in pull sheet' };
        }

        const now = new Date().toISOString();
        const newQty = item.qty_returned + qty;

        db.prepare(
          `UPDATE pull_sheet_items SET qty_returned = ?, status = ?, updated_at = ? 
           WHERE pull_sheet_id = ? AND inventory_item_id = ?`
        ).run(newQty, 'returned', now, pullSheetId, itemId);

        recordChange('pull_sheet_items', 'UPDATE', item.id, item, {
          qty_returned: newQty,
          status: 'returned',
          updated_at: now,
        });

        const updated = db
          .prepare(
            'SELECT * FROM pull_sheet_items WHERE pull_sheet_id = ? AND inventory_item_id = ?'
          )
          .get(pullSheetId, itemId) as PullSheetItem;

        return { success: true, data: updated };
      } catch (error) {
        console.error('Error returning item:', error);
        return { success: false, error: (error as any).message };
      }
    }
  );
}

/**
 * Helper: Record change in outbox
 */
function recordChange(
  tableName: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  recordId: string,
  oldValues: any,
  newValues: any
): void {
  try {
    const db = getDatabase();
    const id = uuidv4();

    db.prepare(`
      INSERT INTO changes_outbox (
        id, table_name, operation, record_id, old_values, new_values, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      tableName,
      operation,
      recordId,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      new Date().toISOString()
    );

    console.log(`📝 Recorded change: ${operation} on ${recordId}`);
  } catch (error) {
    console.error('Error recording change:', error);
  }
}
