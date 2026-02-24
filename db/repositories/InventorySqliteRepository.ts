/**
 * SQLite Inventory Repository
 * Desktop implementation using local SQLite database
 */

import { IInventoryRepository, InventoryItem } from './InventoryRepo';

// Lazy-loaded to avoid importing Electron in web context
function getIPC(): any {
  if (typeof window !== 'undefined' && 'electronAPI' in window) {
    return (window as any).electronAPI;
  }
  throw new Error('Electron API not available');
}

export class InventorySqliteRepository implements IInventoryRepository {
  async list(): Promise<InventoryItem[]> {
    const ipc = getIPC();
    const result = await ipc.inventory.list();
    if (!result.success) {
      console.error('Error listing inventory:', result.error);
      return [];
    }
    return result.data;
  }

  async getById(id: string): Promise<InventoryItem | null> {
    const ipc = getIPC();
    const result = await ipc.inventory.getById(id);
    if (!result.success) {
      console.error('Error getting item:', result.error);
      return null;
    }
    return result.data;
  }

  async create(item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> {
    const ipc = getIPC();
    const result = await ipc.inventory.create(item);
    if (!result.success) {
      throw new Error(`Failed to create item: ${result.error}`);
    }
    return result.data;
  }

  async update(id: string, changes: Partial<InventoryItem>): Promise<InventoryItem> {
    const ipc = getIPC();
    const result = await ipc.inventory.update(id, changes);
    if (!result.success) {
      throw new Error(`Failed to update item: ${result.error}`);
    }
    return result.data;
  }

  async delete(id: string): Promise<boolean> {
    // TODO: Implement delete in IPC handlers
    console.warn('Delete not yet implemented');
    return false;
  }

  async searchByBarcode(barcode: string): Promise<InventoryItem | null> {
    const ipc = getIPC();
    const result = await ipc.inventory.searchByBarcode(barcode);
    if (!result.success) {
      console.error('Error searching by barcode:', result.error);
      return null;
    }
    return result.data;
  }

  async searchByName(name: string): Promise<InventoryItem[]> {
    const ipc = getIPC();
    const result = await ipc.inventory.searchByName(name);
    if (!result.success) {
      console.error('Error searching by name:', result.error);
      return [];
    }
    return result.data;
  }

  async getByCategory(category: string): Promise<InventoryItem[]> {
    // TODO: Add category filter in SQLite
    const items = await this.list();
    return items.filter((i) => i.category === category);
  }

  async getByLocation(location: string): Promise<InventoryItem[]> {
    // TODO: Add location filter in SQLite
    const items = await this.list();
    return items.filter((i) => i.location === location);
  }

  async updateQuantity(id: string, qty: number): Promise<InventoryItem> {
    const ipc = getIPC();
    const result = await ipc.inventory.update(id, { qty_in_warehouse: qty });
    if (!result.success) {
      throw new Error(`Failed to update quantity: ${result.error}`);
    }
    return result.data;
  }

  async checkoutItem(id: string, qty: number): Promise<InventoryItem> {
    const ipc = getIPC();
    const result = await ipc.inventory.checkoutItem(id, qty);
    if (!result.success) {
      throw new Error(`Failed to checkout item: ${result.error}`);
    }
    return result.data;
  }

  async returnItem(id: string, qty: number): Promise<InventoryItem> {
    const ipc = getIPC();
    const result = await ipc.inventory.returnItem(id, qty);
    if (!result.success) {
      throw new Error(`Failed to return item: ${result.error}`);
    }
    return result.data;
  }
}
