"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Barcode, Package, Undo2, CheckCircle, X, AlertCircle } from "lucide-react";
import { playSuccess, playReject } from "@/lib/utils/sounds";

type ScannerProps = {
  pullSheetId: string;
  onScan?: (scan: any) => void;
};

type ScanResult = {
  success: boolean;
  message: string;
  item?: any;
  scan?: any;
};

export default function BarcodeScanner({ pullSheetId, onScan }: ScannerProps) {
  const [barcode, setBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanType, setScanType] = useState<'pull' | 'return' | 'verify'>('pull');
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount and when scan completes
  useEffect(() => {
    inputRef.current?.focus();
  }, [scanning]);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    
    if (!barcode.trim() || scanning) return;
    
    setScanning(true);
    setShowResult(false);

    try {
      // 1. Find inventory item by barcode
      const { data: inventoryItem, error: invError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('barcode', barcode.trim())
        .maybeSingle();

      if (invError) throw invError;

      if (!inventoryItem) {
        setLastScan({
          success: false,
          message: `Barcode ${barcode} not found in inventory`,
        });
        setShowResult(true);
        setBarcode("");
        setScanning(false);
        return;
      }

      // 2. Find matching pull sheet item
      const { data: pullSheetItem, error: itemError } = await supabase
        .from('pull_sheet_items')
        .select('*')
        .eq('pull_sheet_id', pullSheetId)
        .eq('inventory_item_id', (inventoryItem as any).id)
        .maybeSingle();

      // Fetch pull sheet status to determine scan behavior (create-mode vs active pulls)
      const { data: sheetData } = await supabase
        .from('pull_sheets')
        .select('status')
        .eq('id', pullSheetId)
        .maybeSingle();
      const sheetStatus = (sheetData as any)?.status || 'draft';

      // If there's no pull sheet item for this inventory unit, create one so scans are attached
      let resolvedPullSheetItem = pullSheetItem as any | null;
      if (!resolvedPullSheetItem) {
        try {
          const { data: createdItem, error: createError } = await (supabase as any)
            .from('pull_sheet_items')
            .insert([
              {
                pull_sheet_id: pullSheetId,
                inventory_item_id: (inventoryItem as any).id,
                item_name: (inventoryItem as any).name,
                qty_requested: 1,
                qty_pulled: 0,
                qty_fulfilled: 0,
                prep_status: 'pending'
              },
            ])
            .select()
            .maybeSingle();

          if (!createError && createdItem) {
            resolvedPullSheetItem = createdItem;
          }
        } catch (err) {
          console.warn('Failed to create pull_sheet_item for scanned unit:', err);
        }
      }

      // Normalize sheet status string and decide if we're in active pull mode
      const normalizedStatus = String(sheetStatus || '').toLowerCase();
      // Treat the sheet as active pull mode only when it is explicitly marked 'active'.
      // This prevents 'create' / draft flows from behaving like live warehouse picks.
      const isActivePullMode = scanType === 'pull' && normalizedStatus === 'active';

      // Debug: log resolved mode for easier troubleshooting in the browser console
      // (remove or lower verbosity later if noisy).
      // eslint-disable-next-line no-console
      console.debug('[BarcodeScanner] sheetStatus=', sheetStatus, 'normalized=', normalizedStatus, 'isActivePullMode=', isActivePullMode);

      // 3. Check for duplicate scans (unit-level tracking)
      // Ensure we have a resolved pull sheet item first (created above if missing)
      if (resolvedPullSheetItem && isActivePullMode) {
        const { data: existingScan, error: dupError } = await supabase
          .from('pull_sheet_item_scans')
          .select('*')
          .eq('pull_sheet_item_id', (resolvedPullSheetItem as any).id)
          .eq('barcode', barcode.trim())
          .eq('scan_status', 'active')
          .maybeSingle();

        if (dupError) {
          console.warn('Error checking for duplicates:', dupError);
        }

        if (existingScan) {
          // Duplicate detected - reject with sound
          playReject();
          setLastScan({
            success: false,
            message: `Duplicate scan! ${(inventoryItem as any).name} has already been scanned for this pull sheet.`,
          });
          setShowResult(true);
          setBarcode("");
          setScanning(false);
          return;
        }
      }

      // 4. Record the unit scan (for pull operations)
      // Only record unit-level active scans when the pull sheet is in active pull mode
      if (resolvedPullSheetItem && isActivePullMode) {
        const { error: unitScanError } = await (supabase
          .from('pull_sheet_item_scans') as any)
          .insert([{
            pull_sheet_id: pullSheetId,
            pull_sheet_item_id: (resolvedPullSheetItem as any).id,
            inventory_item_id: (inventoryItem as any).id,
            barcode: barcode.trim(),
            scan_status: 'active',
            scanned_by: 'Current User', // TODO: Get from auth context
          }]);

        if (unitScanError) {
          console.warn('Error recording unit scan:', unitScanError);
        }
        // eslint-disable-next-line no-console
        console.debug('[BarcodeScanner] Recorded unit scan for pull_sheet_item_id=', (resolvedPullSheetItem as any).id);
        // qty_fulfilled / qty_pulled can be updated by triggers or manually below
      }

      // 5. Record the scan history (always record history regardless of mode)
      // 5. Record the scan history
      const scanData = {
        pull_sheet_id: pullSheetId,
        pull_sheet_item_id: (pullSheetItem as any)?.id || null,
        inventory_item_id: (inventoryItem as any).id,
        barcode: barcode.trim(),
        scan_type: scanType,
        scanned_by: 'Current User', // TODO: Get from auth context
        notes: null,
      };

      const { data: scanRecord, error: scanError } = await (supabase
        .from('pull_sheet_scans') as any)
        .insert([scanData])
        .select()
        .single();

      if (scanError) throw scanError;

      // 6. Update pull sheet item qty_pulled if it's an active pull scan
      if (resolvedPullSheetItem && isActivePullMode) {
        const newQtyPulled = ((resolvedPullSheetItem as any).qty_pulled || 0) + 1;
        await (supabase
          .from('pull_sheet_items') as any)
          .update({ qty_pulled: newQtyPulled })
          .eq('id', (resolvedPullSheetItem as any).id);
      }

      // 7. Play success sound
      playSuccess();

      // 8. Show success
      setLastScan({
        success: true,
        message: `${(inventoryItem as any).name} scanned successfully`,
        item: inventoryItem,
        scan: scanRecord,
      });
      setShowResult(true);

      // Call callback if provided
      if (onScan) {
        onScan(scanRecord);
      }

      // Clear barcode and refocus
      setBarcode("");
      setTimeout(() => {
        setShowResult(false);
      }, 3000);

    } catch (err: any) {
      console.error('Scan error:', err);
      playReject();
      setLastScan({
        success: false,
        message: err.message || 'Error processing scan',
      });
      setShowResult(true);
    } finally {
      setScanning(false);
      inputRef.current?.focus();
    }
  }

  function getScanTypeIcon() {
    switch (scanType) {
      case 'pull':
        return <Package size={20} />;
      case 'return':
        return <Undo2 size={20} />;
      case 'verify':
        return <CheckCircle size={20} />;
    }
  }

  function getScanTypeColor() {
    switch (scanType) {
      case 'pull':
        return 'bg-blue-600 hover:bg-blue-500 border-blue-500';
      case 'return':
        return 'bg-green-600 hover:bg-green-500 border-green-500';
      case 'verify':
        return 'bg-purple-600 hover:bg-purple-500 border-purple-500';
    }
  }

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Barcode size={24} className="text-amber-400" />
        <h3 className="font-semibold text-lg text-white">Quick Scan</h3>
      </div>

      <form onSubmit={handleScan} className="space-y-3">
        {/* Barcode Input */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Scan or enter barcode..."
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-4 py-2 text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
            disabled={scanning}
            autoFocus
          />
          <button
            type="submit"
            disabled={!barcode.trim() || scanning}
            className={`px-6 py-2 rounded font-medium text-white border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getScanTypeColor()}`}
          >
            {scanning ? (
              <span>Scanning...</span>
            ) : (
              <span className="flex items-center gap-2">
                {getScanTypeIcon()}
                Scan
              </span>
            )}
          </button>
        </div>
      </form>

      {/* Scan Result Notification */}
      {showResult && lastScan && (
        <div className={`mt-3 p-3 rounded border ${
          lastScan.success 
            ? 'bg-green-900/20 border-green-500/50 text-green-200' 
            : 'bg-red-900/20 border-red-500/50 text-red-200'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-medium">{lastScan.message}</div>
              {lastScan.item && (
                <div className="text-sm mt-1 opacity-80">
                  Category: {lastScan.item.category || 'N/A'} • 
                  Location: {lastScan.item.location || 'N/A'}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowResult(false)}
              className="text-current opacity-70 hover:opacity-100"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-zinc-500">
        Tip: Use a barcode scanner for fastest operation
      </div>
    </div>
  );
}
