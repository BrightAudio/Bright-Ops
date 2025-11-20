"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import BarcodeScanner from "@/components/BarcodeScanner";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

type ReturnItem = {
  id: string;
  item_name: string;
  qty_required: number;
  qty_returned: number;
  category: string;
};

type Job = {
  id: string;
  code: string;
  title: string;
  expected_return_date: string | null;
};

type ScanRecord = {
  id: string;
  item_name: string;
  barcode: string;
  scanned_at: string;
};

const CATEGORY_ORDER = [
  'Audio',
  'Lighting',
  'Video',
  'Stage',
  'Pipe and Drape',
  'Edison',
  'Misc',
  'Other'
];

const playBeep = (type: "success" | "error") => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === "success") {
      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    } else {
      oscillator.frequency.value = 400;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    }

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + (type === "success" ? 0.2 : 0.3));
  } catch (e) {
    // Silently fail if audio not available
  }
};

export default function ReturnManifestClient({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanError, setScanError] = useState<string | null>(null);
  const [pullSheetId, setPullSheetId] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [showScanHistory, setShowScanHistory] = useState(false);
  const [loadingScanHistory, setLoadingScanHistory] = useState(false);
  const [showFinalizePrompt, setShowFinalizePrompt] = useState(false);
  const [userName, setUserName] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadData();
  }, [jobId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load job info
      const { data: jobData } = await supabase
        .from("jobs")
        .select("id, code, title, expected_return_date")
        .eq("id", jobId)
        .single();

      if (jobData) {
        setJob(jobData as any);
      }

      // Load pull sheets for this job
      const { data: pullSheets } = await supabase
        .from("pull_sheets")
        .select("id")
        .eq("job_id", jobId);

      if (!pullSheets || pullSheets.length === 0) {
        setReturnItems([]);
        setLoading(false);
        return;
      }

      // Store first pull sheet id for scan history
      if (pullSheets.length > 0) {
        setPullSheetId((pullSheets[0] as any).id);
      }

      // Load pull sheet items with their details
      const pullSheetIds = (pullSheets as any[]).map(ps => ps.id);
      const { data: itemsData } = await supabase
        .from("pull_sheet_items")
        .select("id, item_name, qty_requested, category")
        .in("pull_sheet_id", pullSheetIds);

      if (itemsData) {
        const items: ReturnItem[] = itemsData.map((item: any) => ({
          id: item.id,
          item_name: item.item_name || 'Unknown',
          qty_required: item.qty_requested || 0,
          qty_returned: 0,
          category: item.category || 'Other'
        }));
        setReturnItems(items);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (scan: any) => {
    setScanError(null);

    if (!scan?.barcode) return;

    try {
      // Find item in inventory by barcode
      const { data: inventoryItem } = await supabase
        .from('inventory_items')
        .select('id, name, qty_in_warehouse')
        .eq('barcode', scan.barcode.trim())
        .single();

      if (!inventoryItem) {
        setScanError('Item not found');
        playBeep('error');
        return;
      }

      const invItem = inventoryItem as any;

      // Find matching return item
      const matchingItem = returnItems.find(item =>
        item.item_name.toLowerCase() === invItem.name.toLowerCase()
      );

      if (!matchingItem) {
        setScanError('Item not required for this return');
        playBeep('error');
        return;
      }

      if (matchingItem.qty_returned >= matchingItem.qty_required) {
        setScanError('All units already returned');
        playBeep('error');
        return;
      }

      // Update local state
      setReturnItems(prev =>
        prev.map(item =>
          item.id === matchingItem.id
            ? { ...item, qty_returned: item.qty_returned + 1 }
            : item
        )
      );

      // Update warehouse inventory
      const { error } = await (supabase as any)
        .from('inventory_items')
        .update({
          qty_in_warehouse: (invItem.qty_in_warehouse || 0) + 1,
          location: 'Warehouse'
        })
        .eq('id', invItem.id);

      if (!error) {
        playBeep('success');
        
        // Track to scan history if we have pull sheet id
        if (pullSheetId) {
          await (supabase as any)
            .from('pull_sheet_scans')
            .insert({
              pull_sheet_id: pullSheetId,
              pull_sheet_item_id: matchingItem.id,
              barcode: scan.barcode.trim(),
              item_name: matchingItem.item_name
            } as any);
        }
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed');
      playBeep('error');
    }
  };

  async function loadScanHistory() {
    if (!pullSheetId) return;
    
    setLoadingScanHistory(true);
    try {
      const { data, error } = await supabase
        .from("pull_sheet_scans")
        .select("id, item_name, barcode, scanned_at")
        .eq("pull_sheet_id", pullSheetId)
        .order("scanned_at", { ascending: false })
        .limit(50);

      if (error) {
        console.warn("Scan history not available (table may not exist):", error);
        setScanHistory([]);
        setShowScanHistory(false);
        return;
      }

      setScanHistory((data as any[]) || []);
      setShowScanHistory(true);
    } catch (error) {
      console.warn("Scan history not available:", error);
      setScanHistory([]);
      setShowScanHistory(false);
    } finally {
      setLoadingScanHistory(false);
    }
  }

  async function handleFinalize() {
    if (!userName.trim()) {
      alert("Please enter your name");
      return;
    }

    setFinalizing(true);
    try {
      // Get signature from canvas
      const signature = canvasRef.current?.toDataURL() || '';

      // Update pull sheets status to 'returned'
      const { error: pullSheetError } = await ((supabase as any)
        .from('pull_sheets')
        .update({
          status: 'returned',
          updated_at: new Date().toISOString()
        }) as any)
        .eq('job_id', jobId);

      if (pullSheetError) {
        console.error('Error updating pull sheets:', pullSheetError);
      }

      // Archive the job
      const { error: jobError } = await ((supabase as any)
        .from('jobs')
        .update({
          archived: true,
          status: 'completed'
        }) as any)
        .eq('id', jobId);

      if (jobError) throw jobError;

      // Store finalization record
      const { error: finalizeError } = await (supabase as any)
        .from('return_manifests')
        .insert({
          job_id: jobId,
          finalized_by: userName,
          finalized_at: new Date().toISOString(),
          signature: signature,
          manifest_data: {
            items: returnItems,
            total_returned: returnItems.reduce((sum, item) => sum + item.qty_returned, 0),
            total_required: returnItems.reduce((sum, item) => sum + item.qty_required, 0)
          }
        } as any);

      if (finalizeError && finalizeError.code !== 'PGRST116') {
        console.warn('Could not save to return_manifests (table may not exist):', finalizeError);
      }

      setShowFinalizePrompt(false);
      alert('Return has been finalized! Job archived successfully.');
      setTimeout(() => router.push('/app/warehouse/returns'), 1500);
    } catch (error) {
      console.error('Error finalizing return:', error);
      alert('Failed to finalize return');
    } finally {
      setFinalizing(false);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const itemsByCategory = returnItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ReturnItem[]>);

  const categoriesToDisplay = CATEGORY_ORDER.filter(cat => itemsByCategory[cat]);
  const customCategories = Object.keys(itemsByCategory)
    .filter(cat => !CATEGORY_ORDER.includes(cat))
    .sort();
  const allCategories = [...categoriesToDisplay, ...customCategories];

  const totalRequired = returnItems.reduce((sum, item) => sum + item.qty_required, 0);
  const totalReturned = returnItems.reduce((sum, item) => sum + item.qty_returned, 0);
  const isComplete = totalRequired > 0 && totalReturned === totalRequired;

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Navigation & Scanner */}
      <div className="no-print bg-zinc-800 border-b border-zinc-700 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-zinc-300 hover:text-white"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <div className="flex gap-2">
              <button
                onClick={loadScanHistory}
                disabled={loadingScanHistory}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-semibold disabled:opacity-50"
              >
                {loadingScanHistory ? "Loading..." : "Scan History"}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-zinc-600 text-white px-4 py-2 rounded hover:bg-zinc-700 font-semibold"
              >
                <Printer size={18} />
                Print
              </button>
            </div>
          </div>

          {scanError && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-sm text-red-200">
              {scanError}
            </div>
          )}

          <BarcodeScanner pullSheetId={jobId} onScan={handleScan} />
        </div>
      </div>

      {/* Return Manifest */}
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Return Manifest</h1>
              <div className="text-zinc-400 mb-3">
                <span className="font-semibold text-amber-400">{job?.code}</span> - {job?.title}
              </div>
              <div className="text-sm text-zinc-500">
                Return Date: {new Date().toLocaleDateString()}
              </div>
            </div>
            <div className={`px-4 py-2 rounded-lg font-semibold text-sm ${
              isComplete 
                ? 'bg-green-900/30 border-2 border-green-500 text-green-300' 
                : 'bg-yellow-900/30 border-2 border-yellow-500 text-yellow-300'
            }`}>
              {isComplete ? '✓ COMPLETE' : 'IN PROGRESS'}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-400">Progress</span>
              <span className="text-white font-semibold">
                {totalReturned} / {totalRequired} Items
              </span>
            </div>
            <div className="w-full bg-zinc-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  isComplete ? 'bg-green-500' : 'bg-amber-500'
                }`}
                style={{ width: `${totalRequired > 0 ? (totalReturned / totalRequired) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Items by Category */}
        {allCategories.map(category => {
          const categoryItems = itemsByCategory[category] || [];
          const categoryReturned = categoryItems.reduce((sum, item) => sum + item.qty_returned, 0);
          const categoryRequired = categoryItems.reduce((sum, item) => sum + item.qty_required, 0);
          const categoryComplete = categoryReturned === categoryRequired;

          return (
            <div key={category} className="mb-6 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
              <div className="bg-zinc-700 px-4 py-3 flex items-center justify-between">
                <h2 className="text-white font-bold text-sm uppercase">{category}</h2>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400 text-sm">
                    {categoryReturned} / {categoryRequired}
                  </span>
                  {categoryComplete && (
                    <span className="text-green-400 font-bold">✓</span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-zinc-400 border-b border-zinc-700">
                      <th className="px-4 py-3 font-semibold">Item</th>
                      <th className="px-4 py-3 font-semibold text-center w-24">Required</th>
                      <th className="px-4 py-3 font-semibold text-center w-24">Returned</th>
                      <th className="no-print px-4 py-3 font-semibold text-center w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryItems.map((item, idx) => {
                      const isItemComplete = item.qty_returned >= item.qty_required;
                      return (
                        <tr 
                          key={item.id} 
                          className={`border-b border-zinc-700/50 ${idx % 2 === 0 ? 'bg-zinc-800' : 'bg-zinc-750'} hover:bg-zinc-700/50 transition-colors`}
                        >
                          <td className="px-4 py-3 text-zinc-200 font-medium">{item.item_name}</td>
                          <td className="px-4 py-3 text-center text-zinc-300 font-semibold">{item.qty_required}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${isItemComplete ? 'text-green-400' : 'text-amber-400'}`}>
                              {item.qty_returned}
                            </span>
                          </td>
                          <td className="no-print px-4 py-3 text-center">
                            {isItemComplete ? (
                              <span className="inline-flex items-center px-2 py-1 rounded bg-green-900/30 border border-green-500 text-green-300 text-xs font-semibold">
                                ✓ Done
                              </span>
                            ) : (
                              <span className="text-zinc-500 text-xs">
                                {item.qty_required - item.qty_returned} left
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* Summary */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
          <div className="flex justify-between items-center">
            <div className="text-zinc-400">
              <div className="text-sm mb-1">Total Categories</div>
              <div className="text-2xl font-bold text-white">{allCategories.length}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-zinc-400 mb-1">Total Items</div>
              <div className="text-3xl font-bold text-white">
                <span className={isComplete ? 'text-green-400' : 'text-amber-400'}>{totalReturned}</span>
                <span className="text-zinc-600"> / </span>
                {totalRequired}
              </div>
            </div>
          </div>

          {/* Finalize Button - Only show if complete */}
          {isComplete && (
            <div className="mt-6 pt-6 border-t border-zinc-700">
              <button
                onClick={() => setShowFinalizePrompt(true)}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold text-lg transition-colors"
              >
                ✓ Finalize Return & Archive Job
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scan History Modal */}
      {showScanHistory && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 no-print">
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 max-w-2xl w-full mx-4 shadow-lg max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4 text-white">Return Scan History</h2>
            
            {scanHistory.length === 0 ? (
              <div className="text-center py-8 text-zinc-400">
                No scans recorded for this return yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-700">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-zinc-300">Item Name</th>
                      <th className="px-4 py-2 text-left font-medium text-zinc-300">Barcode</th>
                      <th className="px-4 py-2 text-left font-medium text-zinc-300">Scanned At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanHistory.map((scan: any) => (
                      <tr key={scan.id} className="border-t border-zinc-700 hover:bg-zinc-700/50">
                        <td className="px-4 py-2 text-white">{scan.item_name}</td>
                        <td className="px-4 py-2 text-zinc-400 font-mono text-xs">{scan.barcode}</td>
                        <td className="px-4 py-2 text-zinc-400 text-xs">
                          {new Date(scan.scanned_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowScanHistory(false)}
                className="flex-1 bg-zinc-700 text-white px-4 py-2 rounded hover:bg-zinc-600 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalize Return Modal */}
      {showFinalizePrompt && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 no-print">
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-8 max-w-2xl w-full mx-4 shadow-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-white">Finalize Return Manifest</h2>
            
            <div className="space-y-6">
              {/* User Name Input */}
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Your Name *</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full bg-zinc-900 border border-zinc-600 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              {/* Signature Pad */}
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Signature *</label>
                <div className="border border-zinc-600 rounded bg-zinc-900 p-2">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={150}
                    className="w-full border border-zinc-700 rounded cursor-crosshair bg-white"
                    onMouseDown={(e) => {
                      const canvas = canvasRef.current;
                      if (!canvas) return;
                      const rect = canvas.getBoundingClientRect();
                      const ctx = canvas.getContext('2d');
                      if (!ctx) return;
                      
                      const startX = (e.clientX - rect.left) * (canvas.width / rect.width);
                      const startY = (e.clientY - rect.top) * (canvas.height / rect.height);
                      
                      ctx.beginPath();
                      ctx.moveTo(startX, startY);
                      
                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const x = (moveEvent.clientX - rect.left) * (canvas.width / rect.width);
                        const y = (moveEvent.clientY - rect.top) * (canvas.height / rect.height);
                        ctx.lineTo(x, y);
                        ctx.stroke();
                      };
                      
                      const handleMouseUp = () => {
                        ctx.closePath();
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  />
                </div>
                <button
                  onClick={() => {
                    const canvas = canvasRef.current;
                    if (canvas) {
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                      }
                    }
                  }}
                  className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  Clear Signature
                </button>
              </div>

              {/* Summary */}
              <div className="bg-zinc-900 border border-zinc-700 p-4 rounded">
                <h3 className="font-semibold text-white mb-2">Return Summary</h3>
                <div className="text-sm text-zinc-300 space-y-1">
                  <div>Job Code: <span className="font-semibold text-amber-400">{job?.code}</span></div>
                  <div>Job Title: <span className="font-semibold text-white">{job?.title}</span></div>
                  <div>Items Returned: <span className="font-semibold text-green-400">{totalReturned} / {totalRequired}</span></div>
                  <div>Status: <span className="font-semibold text-green-400">Complete</span></div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowFinalizePrompt(false)}
                disabled={finalizing}
                className="flex-1 bg-zinc-700 text-white px-4 py-2 rounded hover:bg-zinc-600 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalize}
                disabled={finalizing || !userName.trim()}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium disabled:opacity-50"
              >
                {finalizing ? "Finalizing..." : "Finalize & Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
