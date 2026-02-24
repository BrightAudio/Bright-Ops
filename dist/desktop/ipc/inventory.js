"use strict";
/**
 * Inventory IPC Handlers
 * Handle all inventory operations from React via IPC
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerInventoryHandlers = registerInventoryHandlers;
const electron_1 = require("electron");
const sqlite_1 = require("../db/sqlite");
const uuid_1 = require("uuid");
/**
 * Register all inventory handlers
 */
function registerInventoryHandlers() {
    console.log('📦 Registering inventory IPC handlers...');
    /**
     * List all inventory items
     */
    electron_1.ipcMain.handle('inventory:list', async () => {
        try {
            const db = (0, sqlite_1.getDatabase)();
            const items = db
                .prepare('SELECT * FROM inventory_items ORDER BY name')
                .all();
            return { success: true, data: items };
        }
        catch (error) {
            console.error('Error listing inventory:', error);
            return { success: false, error: error.message };
        }
    });
    /**
     * Get inventory item by ID
     */
    electron_1.ipcMain.handle('inventory:getById', async (_event, id) => {
        try {
            const db = (0, sqlite_1.getDatabase)();
            const item = db
                .prepare('SELECT * FROM inventory_items WHERE id = ?')
                .get(id);
            return { success: true, data: item || null };
        }
        catch (error) {
            console.error('Error getting item:', error);
            return { success: false, error: error.message };
        }
    });
    /**
     * Search by barcode
     */
    electron_1.ipcMain.handle('inventory:searchByBarcode', async (_event, barcode) => {
        try {
            const db = (0, sqlite_1.getDatabase)();
            const item = db
                .prepare('SELECT * FROM inventory_items WHERE barcode = ?')
                .get(barcode);
            return { success: true, data: item || null };
        }
        catch (error) {
            console.error('Error searching by barcode:', error);
            return { success: false, error: error.message };
        }
    });
    /**
     * Search by name (fuzzy)
     */
    electron_1.ipcMain.handle('inventory:searchByName', async (_event, name) => {
        try {
            const db = (0, sqlite_1.getDatabase)();
            const items = db
                .prepare('SELECT * FROM inventory_items WHERE name LIKE ? ORDER BY name')
                .all(`%${name}%`);
            return { success: true, data: items };
        }
        catch (error) {
            console.error('Error searching by name:', error);
            return { success: false, error: error.message };
        }
    });
    /**
     * Create new inventory item
     */
    electron_1.ipcMain.handle('inventory:create', async (_event, item) => {
        try {
            const db = (0, sqlite_1.getDatabase)();
            const id = (0, uuid_1.v4)();
            const now = new Date().toISOString();
            db.prepare(`
        INSERT INTO inventory_items (
          id, name, barcode, qty_in_warehouse, category, location,
          unit_value, purchase_cost, purchase_date, maintenance_status,
          repair_cost, image_url, updated_at, synced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(id, item.name, item.barcode || null, item.qty_in_warehouse || 0, item.category || null, item.location || null, item.unit_value || 0, item.purchase_cost || 0, item.purchase_date || null, item.maintenance_status || 'good', item.repair_cost || 0, item.image_url || null, now);
            // Write to outbox
            recordChange('inventory_items', 'INSERT', id, null, { ...item, id });
            const created = db
                .prepare('SELECT * FROM inventory_items WHERE id = ?')
                .get(id);
            return { success: true, data: created };
        }
        catch (error) {
            console.error('Error creating item:', error);
            return { success: false, error: error.message };
        }
    });
    /**
     * Update inventory item
     */
    electron_1.ipcMain.handle('inventory:update', async (_event, id, changes) => {
        try {
            const db = (0, sqlite_1.getDatabase)();
            // Get old values
            const oldItem = db
                .prepare('SELECT * FROM inventory_items WHERE id = ?')
                .get(id);
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
                .get(id);
            return { success: true, data: updated };
        }
        catch (error) {
            console.error('Error updating item:', error);
            return { success: false, error: error.message };
        }
    });
    /**
     * Checkout item (reduce quantity)
     */
    electron_1.ipcMain.handle('inventory:checkoutItem', async (_event, id, qty) => {
        try {
            const db = (0, sqlite_1.getDatabase)();
            const item = db
                .prepare('SELECT * FROM inventory_items WHERE id = ?')
                .get(id);
            if (!item) {
                return { success: false, error: 'Item not found' };
            }
            const newQty = Math.max(0, item.qty_in_warehouse - qty);
            const now = new Date().toISOString();
            db.prepare('UPDATE inventory_items SET qty_in_warehouse = ?, updated_at = ? WHERE id = ?').run(newQty, now, id);
            // Write to outbox
            recordChange('inventory_items', 'UPDATE', id, item, {
                qty_in_warehouse: newQty,
                updated_at: now,
            });
            const updated = db
                .prepare('SELECT * FROM inventory_items WHERE id = ?')
                .get(id);
            return { success: true, data: updated };
        }
        catch (error) {
            console.error('Error checking out item:', error);
            return { success: false, error: error.message };
        }
    });
    /**
     * Return item (increase quantity)
     */
    electron_1.ipcMain.handle('inventory:returnItem', async (_event, id, qty) => {
        try {
            const db = (0, sqlite_1.getDatabase)();
            const item = db
                .prepare('SELECT * FROM inventory_items WHERE id = ?')
                .get(id);
            if (!item) {
                return { success: false, error: 'Item not found' };
            }
            const newQty = item.qty_in_warehouse + qty;
            const now = new Date().toISOString();
            db.prepare('UPDATE inventory_items SET qty_in_warehouse = ?, updated_at = ? WHERE id = ?').run(newQty, now, id);
            // Write to outbox
            recordChange('inventory_items', 'UPDATE', id, item, {
                qty_in_warehouse: newQty,
                updated_at: now,
            });
            const updated = db
                .prepare('SELECT * FROM inventory_items WHERE id = ?')
                .get(id);
            return { success: true, data: updated };
        }
        catch (error) {
            console.error('Error returning item:', error);
            return { success: false, error: error.message };
        }
    });
}
/**
 * Helper: Record change in outbox
 */
function recordChange(tableName, operation, recordId, oldValues, newValues) {
    try {
        const db = (0, sqlite_1.getDatabase)();
        const id = (0, uuid_1.v4)();
        db.prepare(`
      INSERT INTO changes_outbox (
        id, table_name, operation, record_id, old_values, new_values, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, tableName, operation, recordId, oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null, new Date().toISOString());
        console.log(`📝 Recorded change: ${operation} on ${recordId}`);
    }
    catch (error) {
        console.error('Error recording change:', error);
    }
}
//# sourceMappingURL=inventory.js.map