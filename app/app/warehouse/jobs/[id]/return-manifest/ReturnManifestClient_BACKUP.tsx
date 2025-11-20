"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Printer, Share2, RefreshCw } from "lucide-react";

type ReturnItem = {
  id: string;
  item_name: string;
  qty_required: number;
  qty_returned: number;
  category: string;
  notes?: string | null;
  barcode?: string;
  image_url?: string | null;
};

type Job = {
  id: string;
  code: string;
  title: string;
  expected_return_date: string | null;
};

type LastScan = {
  barcode: string;
  location: string;
  scanned_at: Date;
  item_name: string;
  image_url?: string;
};

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
    // Silently fail
  }
};

export default function ReturnManifestClient({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pullSheetId, setPullSheetId] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<LastScan | null>(null);
  const [showScanHistory, setShowScanHistory] = useState(false);
  const [showManifest, setShowManifest] = useState(false);
  const [showFinalizePrompt, setShowFinalizePrompt] = useState(false);
  const [userName, setUserName] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [soundTheme, setSoundTheme] = useState<"ding" | "beep">("ding");
  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
    // Focus on scan input
    scanInputRef.current?.focus();
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

      if (pullSheets.length > 0) {
        setPullSheetId((pullSheets[0] as any).id);
      }

      // Load pull sheet items with inventory item details
      const pullSheetIds = (pullSheets as any[]).map(ps => ps.id);
      const { data: itemsData } = await supabase
        .from("pull_sheet_items")
        .select(`
          id, 
          item_name, 
          qty_requested, 
          category,
          notes,
          inventory_item_id,
          inventory_items(barcode, name, image_url)
        `)
        .in("pull_sheet_id", pullSheetIds);

      if (itemsData) {
        const items: ReturnItem[] = itemsData.map((item: any) => ({
          id: item.id,
          item_name: item.item_name || item.inventory_items?.name || 'Unknown',
          qty_required: item.qty_requested || 0,
          qty_returned: 0,
          category: item.category || 'Other',
          notes: item.notes,
          barcode: item.inventory_items?.barcode || '',
          image_url: item.inventory_items?.image_url
        }));
        setReturnItems(items);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScan = async (barcode: string) => {
    if (!barcode.trim()) return;

    try {
      // Find item in inventory by barcode
      const { data: inventoryItem } = await supabase
        .from('inventory_items')
        .select('id, name, qty_in_warehouse, image_url')
        .eq('barcode', barcode.trim())
        .single();

      if (!inventoryItem) {
        playBeep('error');
        return;
      }

      const invItem = inventoryItem as any;

      // Find matching return item
      const matchingItem = returnItems.find(item =>
        item.item_name.toLowerCase() === invItem.name.toLowerCase() ||
        item.barcode === barcode.trim()
      );

      if (!matchingItem) {
        playBeep('error');
        return;
      }

      if (matchingItem.qty_returned >= matchingItem.qty_required) {
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

      // Update warehouse inventory - RETURN the item to warehouse
      await supabase
        .from('inventory_items')
        .update({
          qty_in_warehouse: (invItem.qty_in_warehouse || 0) + 1,
          location: 'Warehouse'
        })
        .eq('id', invItem.id);

      // Track scan
      if (pullSheetId) {
        await supabase
          .from('pull_sheet_scans')
          .insert({
            pull_sheet_id: pullSheetId,
            pull_sheet_item_id: matchingItem.id,
            barcode: barcode.trim(),
            item_name: matchingItem.item_name,
            scan_type: 'return'
          });
      }

      // Update last scan
      setLastScan({
        barcode: barcode.trim(),
        location: job?.title || 'Unknown',
        scanned_at: new Date(),
        item_name: matchingItem.item_name,
        image_url: invItem.image_url
      });

      playBeep('success');
    } catch (err) {
      console.error('Scan error:', err);
      playBeep('error');
    }

    // Clear input
    if (scanInputRef.current) {
      scanInputRef.current.value = '';
    }
  };

  const handleUpdateNotes = async (itemId: string, notes: string) => {
    setReturnItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, notes } : item
      )
    );

    // Update in database
    await supabase
      .from('pull_sheet_items')
      .update({ notes })
      .eq('id', itemId);
  };

  async function handleFinalize() {
    if (!userName.trim()) {
      alert("Please enter your name");
      return;
    }

    setFinalizing(true);
    try {
      const signature = canvasRef.current?.toDataURL() || '';

      // Update pull sheets status to 'returned'
      await supabase
        .from('pull_sheets')
        .update({
          status: 'returned',
          updated_at: new Date().toISOString()
        })
        .eq('job_id', jobId);

      // Archive the job
      await supabase
        .from('jobs')
        .update({
          archived: true,
          status: 'completed'
        })
        .eq('id', jobId);

      // Store finalization record
      await supabase
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
        });

      setShowFinalizePrompt(false);
      alert('Return finalized! Job archived.');
      router.push('/app/warehouse/returns');
    } catch (error) {
      console.error('Error finalizing:', error);
      alert('Failed to finalize return');
    } finally {
      setFinalizing(false);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  const totalRequired = returnItems.reduce((sum, item) => sum + item.qty_required, 0);
  const totalReturned = returnItems.reduce((sum, item) => sum + item.qty_returned, 0);
  const percentComplete = totalRequired > 0 ? Math.round((totalReturned / totalRequired) * 100) : 0;
  const isComplete = totalRequired > 0 && totalReturned === totalRequired;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Return Manifest - {job?.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Job #{job?.code}</span>
            <span>•</span>
            <span>{totalReturned} of {totalRequired} returned</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 bg-white rounded-lg border border-gray-300 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Return Progress</span>
            <span className="text-sm font-semibold text-gray-700">{percentComplete}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-green-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex gap-3 no-print">
          <button
            onClick={() => setShowScanHistory(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
          >
            Scan History
          </button>
          <button
            onClick={() => router.push(`/app/warehouse/pull-sheets/${pullSheetId}`)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium"
          >
            Pull Sheet
          </button>
          <button
            onClick={() => setShowManifest(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium"
          >
            Manifest
          </button>
          <button
            onClick={() => router.push(`/app/warehouse/jobs/${jobId}`)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium"
          >
            View Job
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium flex items-center gap-2"
          >
            <Printer size={18} />
            Print Manifest PDF
          </button>
          <button
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium flex items-center gap-2"
          >
            <Share2 size={18} />
            Share
          </button>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        {/* Last Scan Section */}
        {lastScan && (
          <div className="mb-6 bg-white rounded-lg border border-gray-300 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Last Scan</h3>
            <div className="flex items-center gap-4">
              {lastScan.image_url && (
                <img
                  src={lastScan.image_url}
                  alt={lastScan.item_name}
                  className="w-24 h-24 object-cover rounded border border-gray-300"
                />
              )}
              <div className="flex-1">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-semibold text-gray-600">Item:</span>
                    <div className="text-gray-900">{lastScan.item_name}</div>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600">Barcode:</span>
                    <div className="text-gray-900 font-mono">{lastScan.barcode}</div>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600">Location:</span>
                    <div className="text-gray-900">{lastScan.location}</div>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600">Scanned:</span>
                    <div className="text-gray-900">{lastScan.scanned_at.toLocaleTimeString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scan Input (Hidden) */}
        <div className="mb-6 no-print">
          <input
            ref={scanInputRef}
            type="text"
            placeholder="Scan barcode..."
            className="w-full px-4 py-3 border-2 border-blue-500 rounded-lg text-lg focus:outline-none focus:border-blue-600"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleBarcodeScan(e.currentTarget.value);
              }
            }}
            autoFocus
          />
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase w-32">QTY</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">DESCRIPTION</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase w-64">NOTES</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase w-40">BARCODE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {returnItems.map((item) => {
                const isComplete = item.qty_returned >= item.qty_required;
                
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50 ${isComplete ? 'bg-green-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold font-mono ${isComplete ? 'text-green-600' : 'text-gray-900'}`}>
                          {item.qty_returned}
                        </span>
                        <span className="text-gray-500">/</span>
                        <span className="text-gray-600 font-mono">{item.qty_required}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.item_name}</div>
                      <div className="text-xs text-gray-500">{item.category}</div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                        placeholder="Add notes..."
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-gray-600">{item.barcode || '—'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Controls */}
        <div className="mt-6 bg-white rounded-lg border border-gray-300 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-2">
                <label className="text-sm font-semibold text-gray-700 block mb-1">Sound Theme:</label>
                <select
                  value={soundTheme}
                  onChange={(e) => setSoundTheme(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="ding">🔔 Ding</option>
                  <option value="beep">📢 Beep</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Scan Prompts:</label>
                <button className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50">
                  Configure
                </button>
              </div>
            </div>
            
            {isComplete && (
              <button
                onClick={() => setShowFinalizePrompt(true)}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg"
              >
                Finalize Return & Archive Job
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Finalize Modal */}
      {showFinalizePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Finalize Return</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name *</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full border border-gray-300 rounded px-4 py-2 focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Signature *</label>
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={150}
                  className="w-full border-2 border-gray-300 rounded cursor-crosshair bg-white"
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
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#000';
                    
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
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Clear Signature
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowFinalizePrompt(false)}
                disabled={finalizing}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalize}
                disabled={finalizing || !userName.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {finalizing ? "Finalizing..." : "Finalize & Archive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan History Modal */}
      {showScanHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Scan History</h2>
            <p className="text-gray-600 mb-4">Recent scans will appear here...</p>
            <button
              onClick={() => setShowScanHistory(false)}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
