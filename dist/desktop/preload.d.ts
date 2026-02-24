/**
 * Preload Script
 * Secure IPC bridge between renderer and main process
 * Exposed to React through contextBridge
 */
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
export {};
//# sourceMappingURL=preload.d.ts.map