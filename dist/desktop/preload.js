"use strict";
/**
 * Preload Script
 * Secure IPC bridge between renderer and main process
 * Exposed to React through contextBridge
 */
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
/**
 * Expose safe API to renderer process
 */
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Inventory operations
    inventory: {
        list: () => electron_1.ipcRenderer.invoke('inventory:list'),
        getById: (id) => electron_1.ipcRenderer.invoke('inventory:getById', id),
        searchByBarcode: (barcode) => electron_1.ipcRenderer.invoke('inventory:searchByBarcode', barcode),
        searchByName: (name) => electron_1.ipcRenderer.invoke('inventory:searchByName', name),
        create: (item) => electron_1.ipcRenderer.invoke('inventory:create', item),
        update: (id, changes) => electron_1.ipcRenderer.invoke('inventory:update', id, changes),
        checkoutItem: (id, qty) => electron_1.ipcRenderer.invoke('inventory:checkoutItem', id, qty),
        returnItem: (id, qty) => electron_1.ipcRenderer.invoke('inventory:returnItem', id, qty),
    },
    // Pull sheet operations
    pullsheets: {
        list: () => electron_1.ipcRenderer.invoke('pullsheets:list'),
        getById: (id) => electron_1.ipcRenderer.invoke('pullsheets:getById', id),
        create: (sheet) => electron_1.ipcRenderer.invoke('pullsheets:create', sheet),
        update: (id, changes) => electron_1.ipcRenderer.invoke('pullsheets:update', id, changes),
        addItem: (sheetId, item) => electron_1.ipcRenderer.invoke('pullsheets:addItem', sheetId, item),
        checkoutItem: (sheetId, itemId, qty) => electron_1.ipcRenderer.invoke('pullsheets:checkoutItem', sheetId, itemId, qty),
        returnItem: (sheetId, itemId, qty) => electron_1.ipcRenderer.invoke('pullsheets:returnItem', sheetId, itemId, qty),
    },
    // Outbox / Sync operations
    sync: {
        getStatus: () => electron_1.ipcRenderer.invoke('sync:getStatus'),
        syncNow: () => electron_1.ipcRenderer.invoke('sync:syncNow'),
        getPendingChanges: () => electron_1.ipcRenderer.invoke('sync:getPendingChanges'),
        clearError: (id) => electron_1.ipcRenderer.invoke('sync:clearError', id),
    },
    // App operations
    app: {
        isOffline: () => electron_1.ipcRenderer.invoke('app:isOffline'),
        getVersion: () => electron_1.ipcRenderer.invoke('app:getVersion'),
        quit: () => electron_1.ipcRenderer.invoke('app:quit'),
    },
    // Listen for app events
    onOnline: (callback) => {
        electron_1.ipcRenderer.on('app:online', callback);
        return () => electron_1.ipcRenderer.removeListener('app:online', callback);
    },
    onOffline: (callback) => {
        electron_1.ipcRenderer.on('app:offline', callback);
        return () => electron_1.ipcRenderer.removeListener('app:offline', callback);
    },
    onSyncProgress: (callback) => {
        electron_1.ipcRenderer.on('sync:progress', (_event, progress) => callback(progress));
        return () => electron_1.ipcRenderer.removeListener('sync:progress', callback);
    },
});
//# sourceMappingURL=preload.js.map