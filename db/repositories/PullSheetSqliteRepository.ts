/**
 * Pull Sheet SQLite Repository
 * Desktop implementation using local SQLite database via IPC
 */

import { IPullSheetRepository, PullSheet, PullSheetItem } from './PullSheetRepo';

// Lazy-loaded to avoid importing Electron in web context
function getIPC(): any {
  if (typeof window !== 'undefined' && 'electronAPI' in window) {
    return (window as any).electronAPI;
  }
  throw new Error('Electron API not available');
}

export class PullSheetSqliteRepository implements IPullSheetRepository {
  async list(): Promise<PullSheet[]> {
    const ipc = getIPC();
    const result = await ipc.pullsheets.list();
    if (!result.success) {
      console.error('Error listing pull sheets:', result.error);
      return [];
    }
    return result.data || [];
  }

  async getById(id: string): Promise<PullSheet | null> {
    const ipc = getIPC();
    const result = await ipc.pullsheets.getById(id);
    if (!result.success) {
      console.error('Error getting pull sheet:', result.error);
      return null;
    }
    return result.data;
  }

  async getByIdWithItems(id: string): Promise<PullSheet | null> {
    const ipc = getIPC();
    const result = await ipc.pullsheets.getById(id);
    if (!result.success) {
      console.error('Error getting pull sheet with items:', result.error);
      return null;
    }
    return result.data;
  }

  async create(data: Omit<PullSheet, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<PullSheet> {
    const ipc = getIPC();
    const result = await ipc.pullsheets.create(data);
    if (!result.success) {
      throw new Error(`Failed to create pull sheet: ${result.error}`);
    }
    return result.data;
  }

  async update(id: string, changes: Partial<PullSheet>): Promise<PullSheet> {
    const ipc = getIPC();
    const result = await ipc.pullsheets.update(id, changes);
    if (!result.success) {
      throw new Error(`Failed to update pull sheet: ${result.error}`);
    }
    return result.data;
  }

  async delete(id: string): Promise<boolean> {
    // TODO: Implement delete in IPC handlers
    console.warn('Delete not yet implemented');
    return false;
  }

  async addItem(pullSheetId: string, item: Omit<PullSheetItem, 'id' | 'created_at' | 'updated_at'>): Promise<PullSheetItem> {
    const ipc = getIPC();
    const result = await ipc.pullsheets.addItem(pullSheetId, item);
    if (!result.success) {
      throw new Error(`Failed to add item: ${result.error}`);
    }
    return result.data;
  }

  async checkoutItem(pullSheetId: string, itemId: string, qty: number): Promise<PullSheetItem> {
    const ipc = getIPC();
    const result = await ipc.pullsheets.checkoutItem(pullSheetId, itemId, qty);
    if (!result.success) {
      throw new Error(`Failed to checkout item: ${result.error}`);
    }
    return result.data;
  }

  async returnItem(pullSheetId: string, itemId: string, qty: number): Promise<PullSheetItem> {
    const ipc = getIPC();
    const result = await ipc.pullsheets.returnItem(pullSheetId, itemId, qty);
    if (!result.success) {
      throw new Error(`Failed to return item: ${result.error}`);
    }
    return result.data;
  }

  async getByJobId(jobId: string): Promise<PullSheet[]> {
    const ipc = getIPC();
    // TODO: Add getByJobId to IPC handlers
    console.warn('getByJobId not yet implemented');
    return [];
  }

  async getByStatus(status: string): Promise<PullSheet[]> {
    const ipc = getIPC();
    // TODO: Add getByStatus to IPC handlers
    console.warn('getByStatus not yet implemented');
    return [];
  }

  async getItem(pullSheetId: string, itemId: string): Promise<PullSheetItem | null> {
    const ipc = getIPC();
    // TODO: Add getItem to IPC handlers
    console.warn('getItem not yet implemented');
    return null;
  }

  async removeItem(pullSheetId: string, itemId: string): Promise<boolean> {
    const ipc = getIPC();
    // TODO: Add removeItem to IPC handlers
    console.warn('removeItem not yet implemented');
    return false;
  }
}
