"use strict";
/**
 * Network Monitor Service
 * Detects network availability and triggers auto-sync
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkMonitor = void 0;
exports.getNetworkMonitor = getNetworkMonitor;
class NetworkMonitor {
    constructor(checkIntervalMs = 5000) {
        this.status = 'online';
        this.listeners = new Set();
        this.checkInterval = null;
        this.checkIntervalMs = checkIntervalMs;
        this.setupListeners();
    }
    /**
     * Setup browser online/offline listeners
     */
    setupListeners() {
        if (typeof window === 'undefined')
            return;
        window.addEventListener('online', () => this.setStatus('online'));
        window.addEventListener('offline', () => this.setStatus('offline'));
        // Initial status
        this.setStatus(navigator.onLine ? 'online' : 'offline');
    }
    /**
     * Set network status and notify listeners
     */
    setStatus(newStatus) {
        if (newStatus !== this.status) {
            this.status = newStatus;
            console.log(`🌐 Network status: ${newStatus}`);
            this.notifyListeners();
        }
    }
    /**
     * Add listener for network status changes
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => {
            this.listeners.delete(callback);
        };
    }
    /**
     * Notify all listeners of status change
     */
    notifyListeners() {
        this.listeners.forEach((callback) => {
            try {
                callback(this.status);
            }
            catch (error) {
                console.error('Error in network listener:', error);
            }
        });
    }
    /**
     * Get current network status
     */
    getStatus() {
        if (typeof window !== 'undefined') {
            return navigator.onLine ? 'online' : 'offline';
        }
        return 'online';
    }
    /**
     * Check if online
     */
    isOnline() {
        return this.getStatus() === 'online';
    }
    /**
     * Check if offline
     */
    isOffline() {
        return this.getStatus() === 'offline';
    }
    /**
     * Start periodic network checks (for Electron)
     */
    startPolling() {
        if (this.checkInterval)
            return;
        this.checkInterval = setInterval(() => {
            const wasOnline = this.status === 'online';
            const isNowOnline = navigator.onLine;
            if (wasOnline !== isNowOnline) {
                this.setStatus(isNowOnline ? 'online' : 'offline');
            }
        }, this.checkIntervalMs);
    }
    /**
     * Stop periodic checks
     */
    stopPolling() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
    /**
     * Cleanup
     */
    destroy() {
        this.stopPolling();
        this.listeners.clear();
    }
}
exports.NetworkMonitor = NetworkMonitor;
// Singleton instance
let instance = null;
function getNetworkMonitor() {
    if (!instance) {
        instance = new NetworkMonitor();
    }
    return instance;
}
exports.default = getNetworkMonitor;
//# sourceMappingURL=networkMonitor.js.map