import { useState, useCallback, useEffect } from 'react';

export interface InventoryItem {
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

interface PaginationState {
  items: InventoryItem[];
  hasMore: boolean;
  nextCursor: string | null;
  isLoading: boolean;
  error: string | null;
}

interface UsePaginatedInventory extends PaginationState {
  loadMore: () => Promise<void>;
  reset: () => Promise<void>;
  refresh: () => Promise<void>;
  totalCount: number | null;
}

/**
 * Hook for paginated inventory loading
 * Handles cursor-based pagination efficiently
 */
export function usePaginatedInventory(pageSize: number = 50): UsePaginatedInventory {
  const [state, setState] = useState<PaginationState>({
    items: [],
    hasMore: false,
    nextCursor: null,
    isLoading: false,
    error: null,
  });
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Check if we're in Electron context
  const isElectron = typeof window !== 'undefined' && (window as any).electron?.ipcRenderer;

  // Get IPC renderer
  const getIPC = useCallback(() => {
    if (!isElectron) return null;
    return (window as any).electron.ipcRenderer;
  }, [isElectron]);

  // Load initial page
  const loadInitial = useCallback(async (): Promise<void> => {
    if (!isElectron) {
      setState((s) => ({ ...s, error: 'Not in Electron context' }));
      return;
    }

    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const ipc = getIPC();
      if (!ipc) throw new Error('IPC not available');

      // Get total count
      const countResult = await ipc.invoke('inventory:getCount');
      if (countResult.success) {
        setTotalCount(countResult.data);
      }

      // Get first page
      const result = await ipc.invoke('inventory:listPaginated', {
        pageSize,
        cursor: undefined,
      });

      if (result.success) {
        setState({
          items: result.data.items,
          hasMore: result.data.hasMore,
          nextCursor: result.data.nextCursor,
          isLoading: false,
          error: null,
        });
      } else {
        setState((s) => ({ ...s, isLoading: false, error: result.error }));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setState((s) => ({ ...s, isLoading: false, error: errorMsg }));
    }
  }, [isElectron, getIPC, pageSize]);

  // Load more items
  const loadMore = useCallback(async (): Promise<void> => {
    if (!state.hasMore || state.isLoading) return;

    setState((s) => ({ ...s, isLoading: true }));

    try {
      const ipc = getIPC();
      if (!ipc) throw new Error('IPC not available');

      const result = await ipc.invoke('inventory:listPaginated', {
        pageSize,
        cursor: state.nextCursor,
      });

      if (result.success) {
        setState((s) => ({
          items: [...s.items, ...result.data.items],
          hasMore: result.data.hasMore,
          nextCursor: result.data.nextCursor,
          isLoading: false,
          error: null,
        }));
      } else {
        setState((s) => ({ ...s, isLoading: false, error: result.error }));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setState((s) => ({ ...s, isLoading: false, error: errorMsg }));
    }
  }, [state.hasMore, state.isLoading, state.nextCursor, getIPC, pageSize]);

  // Reset to initial state
  const reset = useCallback(async (): Promise<void> => {
    setState({
      items: [],
      hasMore: false,
      nextCursor: null,
      isLoading: false,
      error: null,
    });
    await loadInitial();
  }, [loadInitial]);

  // Refresh (reload first page)
  const refresh = useCallback(async (): Promise<void> => {
    await reset();
  }, [reset]);

  // Load initial items on mount
  useEffect(() => {
    if (isElectron && state.items.length === 0) {
      loadInitial();
    }
  }, [isElectron, loadInitial, state.items.length]);

  return {
    ...state,
    loadMore,
    reset,
    refresh,
    totalCount,
  };
}

export default usePaginatedInventory;
