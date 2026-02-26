/**
 * Inventory IPC Handlers
 * Handle all inventory operations from React via IPC
 */

import { ipcMain } from 'electron';
import { getDatabase } from '../db/sqlite';
import { v4 as uuidv4 } from 'uuid';

/**
 * Type definition for inventory items (matches database schema)
 */
interface InventoryItem {
  id: string;
  name: string;
  barcode: string | null;
  qty_in_warehouse: number;
  category: string;
  location: string;
  unit_value: number;
  purchase_cost: number;
  purchase_date: string | null;
  maintenance_status: string;
  repair_cost: number;
  image_url: string | null;
  updated_at: string;
}

/**
 * Register all inventory handlers
 */
export function registerInventoryHandlers(): void {
  console.log('📦 Registering inventory IPC handlers...');

  /**
   * List all inventory items
   */
  ipcMain.handle('inventory:list', async () => {
    try {
      const db = getDatabase();
      const items = db
        .prepare('SELECT * FROM inventory_items ORDER BY name')
        .all() as InventoryItem[];
      return { success: true, data: items };
    } catch (error) {
      console.error('Error listing inventory:', error);
      return { success: false, error: (error as any).message };
    }
  });

  /**
   * Get inventory items with pagination
   * Supports cursor-based pagination for efficient loading
   */
  ipcMain.handle('inventory:listPaginated', async (_event, options: { pageSize?: number; cursor?: string } = {}) => {
    try {
      const db = getDatabase();
      const pageSize = options.pageSize || 50;
      const cursor = options.cursor || '';

      let query = 'SELECT * FROM inventory_items';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any[] = [];

      if (cursor) {
        query += ' WHERE id > ?';
        params.push(cursor);
      }

      query += ' ORDER BY id ASC LIMIT ?';
      params.push(pageSize + 1); // Fetch one extra to determine if more exist

      const items = db.prepare(query).all(...params) as InventoryItem[];

      const hasMore = items.length > pageSize;
      const pageItems = items.slice(0, pageSize);
      const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.id : null;

      return {
        success: true,
        data: {
          items: pageItems,
          hasMore,
          nextCursor,
          count: pageItems.length,
        },
      };
    } catch (error) {
      console.error('Error paginating inventory:', error);
      return { success: false, error: (error as any).message };
    }
  });

  /**
   * Get total inventory count
   */
  ipcMain.handle('inventory:getCount', async () => {
    try {
      const db = getDatabase();
      const result = db
        .prepare('SELECT COUNT(*) as count FROM inventory_items')
        .get() as { count: number };
      return { success: true, data: result.count };
    } catch (error) {
      console.error('Error getting inventory count:', error);
      return { success: false, error: (error as any).message };
    }
  });

  /**
   * Get inventory item by ID
   */
  ipcMain.handle('inventory:getById', async (_event, id: string) => {
    try {
      const db = getDatabase();
      const item = db
        .prepare('SELECT * FROM inventory_items WHERE id = ?')
        .get(id) as InventoryItem | undefined;
      return { success: true, data: item || null };
    } catch (error) {
      console.error('Error getting item:', error);
      return { success: false, error: (error as any).message };
    }
  });

  /**
   * Search by barcode
   */
  ipcMain.handle('inventory:searchByBarcode', async (_event, barcode: string) => {
    try {
      const db = getDatabase();
      const item = db
        .prepare('SELECT * FROM inventory_items WHERE barcode = ?')
        .get(barcode) as InventoryItem | undefined;
      return { success: true, data: item || null };
    } catch (error) {
      console.error('Error searching by barcode:', error);
      return { success: false, error: (error as any).message };
    }
  });

  /**
   * Search by name (fuzzy)
   */
  ipcMain.handle('inventory:searchByName', async (_event, name: string) => {
    try {
      const db = getDatabase();
      const items = db
        .prepare('SELECT * FROM inventory_items WHERE name LIKE ? ORDER BY name')
        .all(`%${name}%`) as InventoryItem[];
      return { success: true, data: items };
    } catch (error) {
      console.error('Error searching by name:', error);
      return { success: false, error: (error as any).message };
    }
  });

  /**
   * Create new inventory item
   */
  ipcMain.handle('inventory:create', async (_event, item: Omit<InventoryItem, 'id'>) => {
    try {
      const db = getDatabase();
      const id = uuidv4();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO inventory_items (
          id, name, barcode, qty_in_warehouse, category, location,
          unit_value, purchase_cost, purchase_date, maintenance_status,
          repair_cost, image_url, updated_at, synced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(
        id,
        item.name,
        item.barcode || null,
        item.qty_in_warehouse || 0,
        item.category || null,
        item.location || null,
        item.unit_value || 0,
        item.purchase_cost || 0,
        item.purchase_date || null,
        item.maintenance_status || 'good',
        item.repair_cost || 0,
        item.image_url || null,
        now
      );

      // Write to outbox
      recordChange('inventory_items', 'INSERT', id, null, { ...item, id });

      const created = db
        .prepare('SELECT * FROM inventory_items WHERE id = ?')
        .get(id) as InventoryItem;

      return { success: true, data: created };
    } catch (error) {
      console.error('Error creating item:', error);
      return { success: false, error: (error as any).message };
    }
  });

  /**
   * Update inventory item
   */
  ipcMain.handle(
    'inventory:update',
    async (_event, id: string, changes: Partial<InventoryItem>) => {
      try {
        const db = getDatabase();

        // Get old values
        const oldItem = db
          .prepare('SELECT * FROM inventory_items WHERE id = ?')
          .get(id) as InventoryItem | undefined;

        if (!oldItem) {
          return { success: false, error: 'Item not found' };
        }

        const now = new Date().toISOString();
        const updateFields = {
          ...changes,
          updated_at: now,
        };

        // Build update query
        const fields = Object.keys(updateFields)
          .map((k) => `${k} = ?`)
          .join(', ');
        const values = [...Object.values(updateFields), id];

        db.prepare(`UPDATE inventory_items SET ${fields} WHERE id = ?`).run(...values);

        // Write to outbox
        recordChange('inventory_items', 'UPDATE', id, oldItem, updateFields);

        const updated = db
          .prepare('SELECT * FROM inventory_items WHERE id = ?')
          .get(id) as InventoryItem;

        return { success: true, data: updated };
      } catch (error) {
        console.error('Error updating item:', error);
        return { success: false, error: (error as any).message };
      }
    }
  );

  /**
   * Checkout item (reduce quantity)
   */
  ipcMain.handle('inventory:checkoutItem', async (_event, id: string, qty: number) => {
    try {
      const db = getDatabase();
      const item = db
        .prepare('SELECT * FROM inventory_items WHERE id = ?')
        .get(id) as InventoryItem | undefined;

      if (!item) {
        return { success: false, error: 'Item not found' };
      }

      const newQty = Math.max(0, item.qty_in_warehouse - qty);
      const now = new Date().toISOString();

      db.prepare(
        'UPDATE inventory_items SET qty_in_warehouse = ?, updated_at = ? WHERE id = ?'
      ).run(newQty, now, id);

      // Write to outbox
      recordChange('inventory_items', 'UPDATE', id, item, {
        qty_in_warehouse: newQty,
        updated_at: now,
      });

      const updated = db
        .prepare('SELECT * FROM inventory_items WHERE id = ?')
        .get(id) as InventoryItem;

      return { success: true, data: updated };
    } catch (error) {
      console.error('Error checking out item:', error);
      return { success: false, error: (error as any).message };
    }
  });

  /**
   * Return item (increase quantity)
   */
  ipcMain.handle('inventory:returnItem', async (_event, id: string, qty: number) => {
    try {
      const db = getDatabase();
      const item = db
        .prepare('SELECT * FROM inventory_items WHERE id = ?')
        .get(id) as InventoryItem | undefined;

      if (!item) {
        return { success: false, error: 'Item not found' };
      }

      const newQty = item.qty_in_warehouse + qty;
      const now = new Date().toISOString();

      db.prepare(
        'UPDATE inventory_items SET qty_in_warehouse = ?, updated_at = ? WHERE id = ?'
      ).run(newQty, now, id);

      // Write to outbox
      recordChange('inventory_items', 'UPDATE', id, item, {
        qty_in_warehouse: newQty,
        updated_at: now,
      });

      const updated = db
        .prepare('SELECT * FROM inventory_items WHERE id = ?')
        .get(id) as InventoryItem;

      return { success: true, data: updated };
    } catch (error) {
      console.error('Error returning item:', error);
      return { success: false, error: (error as any).message };
    }
  });
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
