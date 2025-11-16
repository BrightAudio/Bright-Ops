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

      if (error) throw error;

      setScanHistory((data as any[]) || []);
      setShowScanHistory(true);
    } catch (error) {
      console.error("Error loading scan history:", error);
      alert("Failed to load scan history");
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

      // Archive the job
      const { error: jobError } = await (supabase as any)
        .from('jobs')
        .update({
          archived: true,
          status: 'completed'
        })
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
    <div className="min-h-screen bg-gray-50">
      {/* Navigation & Scanner */}
      <div className="no-print bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 font-semibold"
            >
              <Printer size={18} />
              Print
            </button>
            <button
              onClick={loadScanHistory}
              disabled={loadingScanHistory}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-semibold disabled:opacity-50"
            >
              {loadingScanHistory ? "Loading..." : "Scan History"}
            </button>
          </div>

          {scanError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {scanError}
            </div>
          )}

          <BarcodeScanner pullSheetId={jobId} onScan={handleScan} />
        </div>
      </div>

      {/* Return Manifest */}
      <div className="max-w-7xl mx-auto p-8 bg-white my-6 shadow-lg print:shadow-none print:my-0">
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">RETURN MANIFEST</h1>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-semibold">Job Code: <span className="text-red-600">{job?.code}</span></div>
              <div className="text-lg font-semibold mt-1">{job?.title}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Return Date: {new Date().toLocaleDateString()}</div>
              <div className={`inline-block px-3 py-1 rounded text-xs font-semibold mt-1 ${
                isComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {isComplete ? 'COMPLETE' : 'IN PROGRESS'}
              </div>
            </div>
          </div>
        </div>

        {/* Items by Category */}
        {allCategories.map(category => {
          const categoryItems = itemsByCategory[category] || [];
          return (
            <div key={category} className="mb-8 break-inside-avoid">
              <div className="bg-gray-800 text-white px-3 py-2 font-bold text-sm mb-0">
                {category.toUpperCase()}
              </div>

              <table className="w-full text-xs border-collapse border border-gray-300">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-100">
                    <th className="text-left py-2 px-2 font-semibold border-r border-gray-300">ITEM</th>
                    <th className="text-center py-2 px-2 font-semibold w-20 border-r border-gray-300">REQ</th>
                    <th className="text-center py-2 px-2 font-semibold w-20 border-r border-gray-300">RET</th>
                    <th className="no-print text-center py-2 px-2 font-semibold w-16">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryItems.map((item, idx) => {
                    const isItemComplete = item.qty_returned >= item.qty_required;
                    return (
                      <tr key={item.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="py-2 px-2 border-r border-gray-200 font-medium">{item.item_name}</td>
                        <td className="py-2 px-2 text-center border-r border-gray-200 font-semibold">{item.qty_required}</td>
                        <td className="py-2 px-2 text-center border-r border-gray-200 font-bold text-amber-600">{item.qty_returned}</td>
                        <td className="no-print py-2 px-2 text-center">
                          {isItemComplete ? (
                            <span className="text-green-600 font-bold">✓</span>
                          ) : (
                            <span className="text-gray-400 text-xs">{item.qty_required - item.qty_returned} left</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Summary */}
        <div className="border-t-2 border-gray-800 pt-4 mt-6">
          <div className="flex justify-between items-center mb-6">
            <div className="text-gray-600">
              <div className="text-sm">Total Categories: {allCategories.length}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {totalReturned} / {totalRequired} Items Returned
              </div>
              <div className={`text-sm font-semibold mt-1 ${isComplete ? 'text-green-600' : 'text-amber-600'}`}>
                {isComplete ? '✓ Return Complete' : `${totalRequired - totalReturned} items remaining`}
              </div>
            </div>
          </div>

          {/* Finalize Button - Only show if complete */}
          {isComplete && (
            <div className="flex gap-2 justify-end no-print">
              <button
                onClick={() => setShowFinalizePrompt(true)}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-semibold"
              >
                Finalize Return
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scan History Modal */}
      {showScanHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 shadow-lg max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4 text-gray-900">Return Scan History</h2>
            
            {scanHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No scans recorded for this return yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Item Name</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Barcode</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Scanned At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanHistory.map((scan: any) => (
                      <tr key={scan.id} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-900">{scan.item_name}</td>
                        <td className="px-4 py-2 text-gray-600 font-mono text-xs">{scan.barcode}</td>
                        <td className="px-4 py-2 text-gray-600 text-xs">
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
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalize Return Modal */}
      {showFinalizePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 shadow-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Finalize Return Manifest</h2>
            
            <div className="space-y-6">
              {/* User Name Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name *</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full border border-gray-300 rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              {/* Signature Pad */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Signature *</label>
                <div className="border border-gray-300 rounded bg-white p-2">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={150}
                    className="w-full border border-gray-200 rounded cursor-crosshair bg-white"
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
                  className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  Clear Signature
                </button>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold text-gray-900 mb-2">Return Summary</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <div>Job Code: <span className="font-semibold">{job?.code}</span></div>
                  <div>Job Title: <span className="font-semibold">{job?.title}</span></div>
                  <div>Items Returned: <span className="font-semibold">{totalReturned} / {totalRequired}</span></div>
                  <div>Status: <span className="font-semibold text-green-600">Complete</span></div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowFinalizePrompt(false)}
                disabled={finalizing}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 font-medium disabled:opacity-50"
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
