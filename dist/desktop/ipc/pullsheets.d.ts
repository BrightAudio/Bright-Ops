/**
 * Pull Sheet IPC Handlers
 * Handle pull sheet operations from React via IPC
 */
export type PullSheet = {
    id: string;
    name: string;
    code: string;
    job_id: string | null;
    status: string;
    scheduled_out_at: string | null;
    expected_return_at: string | null;
    created_at: string;
    updated_at: string;
    synced: boolean;
};
export type PullSheetItem = {
    id: string;
    pull_sheet_id: string;
    inventory_item_id: string;
    qty_requested: number;
    qty_checked_out: number;
    qty_returned: number;
    status: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
    synced: boolean;
};
/**
 * Register all pull sheet handlers
 */
export declare function registerPullSheetHandlers(): void;
//# sourceMappingURL=pullsheets.d.ts.map