/**
 * Network Monitor Service
 * Detects network availability and triggers auto-sync
 */

export type NetworkStatus = 'online' | 'offline';

type NetworkCallback = (status: NetworkStatus) => void;

export class NetworkMonitor {
  private status: NetworkStatus = 'online';
  private listeners: Set<NetworkCallback> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;
  private checkIntervalMs: number;

  constructor(checkIntervalMs: number = 5000) {
    this.checkIntervalMs = checkIntervalMs;
    this.setupListeners();
  }

  /**
   * Setup browser online/offline listeners
   */
  private setupListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => this.setStatus('online'));
    window.addEventListener('offline', () => this.setStatus('offline'));

    // Initial status
    this.setStatus(navigator.onLine ? 'online' : 'offline');
  }

  /**
   * Set network status and notify listeners
   */
  private setStatus(newStatus: NetworkStatus): void {
    if (newStatus !== this.status) {
      this.status = newStatus;
      console.log(`🌐 Network status: ${newStatus}`);
      this.notifyListeners();
    }
  }

  /**
   * Add listener for network status changes
   */
  subscribe(callback: NetworkCallback): () => void {
    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(): void {
    this.listeners.forEach((callback) => {
      try {
        callback(this.status);
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  }

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    if (typeof window !== 'undefined') {
      return navigator.onLine ? 'online' : 'offline';
    }
    return 'online';
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return this.getStatus() === 'online';
  }

  /**
   * Check if offline
   */
  isOffline(): boolean {
    return this.getStatus() === 'offline';
  }

  /**
   * Start periodic network checks (for Electron)
   */
  startPolling(): void {
    if (this.checkInterval) return;

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
  stopPolling(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopPolling();
    this.listeners.clear();
  }
}

// Singleton instance
let instance: NetworkMonitor | null = null;

export function getNetworkMonitor(): NetworkMonitor {
  if (!instance) {
    instance = new NetworkMonitor();
  }
  return instance;
}

export default getNetworkMonitor;
