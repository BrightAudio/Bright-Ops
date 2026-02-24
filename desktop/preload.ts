/**
 * Preload Script
 * Secure IPC bridge between renderer and main process
 * Exposed to React through contextBridge
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * Expose safe API to renderer process
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Inventory operations
  inventory: {
    list: () => ipcRenderer.invoke('inventory:list'),
    getById: (id: string) => ipcRenderer.invoke('inventory:getById', id),
    searchByBarcode: (barcode: string) => 
      ipcRenderer.invoke('inventory:searchByBarcode', barcode),
    searchByName: (name: string) => 
      ipcRenderer.invoke('inventory:searchByName', name),
    create: (item: any) => ipcRenderer.invoke('inventory:create', item),
    update: (id: string, changes: any) => 
      ipcRenderer.invoke('inventory:update', id, changes),
    checkoutItem: (id: string, qty: number) => 
      ipcRenderer.invoke('inventory:checkoutItem', id, qty),
    returnItem: (id: string, qty: number) => 
      ipcRenderer.invoke('inventory:returnItem', id, qty),
  },

  // Pull sheet operations
  pullsheets: {
    list: () => ipcRenderer.invoke('pullsheets:list'),
    getById: (id: string) => ipcRenderer.invoke('pullsheets:getById', id),
    create: (sheet: any) => ipcRenderer.invoke('pullsheets:create', sheet),
    update: (id: string, changes: any) => 
      ipcRenderer.invoke('pullsheets:update', id, changes),
    addItem: (sheetId: string, item: any) => 
      ipcRenderer.invoke('pullsheets:addItem', sheetId, item),
    checkoutItem: (sheetId: string, itemId: string, qty: number) => 
      ipcRenderer.invoke('pullsheets:checkoutItem', sheetId, itemId, qty),
    returnItem: (sheetId: string, itemId: string, qty: number) => 
      ipcRenderer.invoke('pullsheets:returnItem', sheetId, itemId, qty),
  },

  // Outbox / Sync operations
  sync: {
    getStatus: () => ipcRenderer.invoke('sync:getStatus'),
    syncNow: () => ipcRenderer.invoke('sync:syncNow'),
    getPendingChanges: () => ipcRenderer.invoke('sync:getPendingChanges'),
    clearError: (id: string) => ipcRenderer.invoke('sync:clearError', id),
  },

  // App operations
  app: {
    isOffline: () => ipcRenderer.invoke('app:isOffline'),
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    quit: () => ipcRenderer.invoke('app:quit'),
  },

  // Listen for app events
  onOnline: (callback: () => void) => {
    ipcRenderer.on('app:online', callback);
    return () => ipcRenderer.removeListener('app:online', callback);
  },

  onOffline: (callback: () => void) => {
    ipcRenderer.on('app:offline', callback);
    return () => ipcRenderer.removeListener('app:offline', callback);
  },

  onSyncProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('sync:progress', (_event, progress) => callback(progress));
    return () => ipcRenderer.removeListener('sync:progress', callback);
  },
});

// Type definition for TypeScript
declare global {
  interface Window {
    electronAPI: {
      inventory: any;
      pullsheets: any;
      sync: any;
      app: any;
      onOnline: (callback: () => void) => void;
      onOffline: (callback: () => void) => void;
      onSyncProgress: (callback: (progress: any) => void) => void;
    };
  }
}
