"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import BarcodeScanner from "@/components/BarcodeScanner";
import { ArrowLeft, Printer } from "lucide-react";

type ReturnItem = {
  id: string;
  item_name: string;
  qty_required: number;
  qty_returned: number;
  category?: string;
};

type Job = {
  id: string;
  code: string;
  title: string;
  expected_return_date: string | null;
};

// Category order matching pull sheets
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
    console.error('Audio context error:', e);
  }
};

export default function ProfessionalReturnManifest({ jobId, job }: { jobId: string; job?: Job }) {
  const router = useRouter();
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    loadReturnData();
  }, [jobId]);

  const loadReturnData = async () => {
    try {
      setLoading(true);
      
      // Get pull sheet items for this job
      const { data: itemsData, error: itemsError } = await supabase
        .from("pull_sheet_items")
        .select("id, item_name, qty_requested, category")
        .eq("job_id", jobId);

      if (itemsError) throw itemsError;

      // Initialize return items with zero returned
      const returnItemsData: ReturnItem[] = (itemsData || []).map((item: any) => ({
        id: item.id,
        item_name: item.item_name || 'Unknown Item',
        qty_required: item.qty_requested || 0,
        qty_returned: 0,
        category: item.category || 'Other'
      }));

      setReturnItems(returnItemsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load return data');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (scan: any) => {
    setScanError(null);
    
    if (!scan?.barcode) return;

    try {
      // Find item by barcode in inventory
      const { data: inventoryItem, error: invError } = await (supabase as any)
        .from('inventory_items')
        .select('id, name, qty_in_warehouse')
        .eq('barcode', scan.barcode.trim())
        .single();

      if (invError || !inventoryItem) {
        setScanError('Item not found');
        playBeep('error');
        return;
      }

      // Find matching return item by name
      const returnItem = returnItems.find(item => 
        item.item_name.toLowerCase() === inventoryItem.name.toLowerCase()
      );

      if (!returnItem) {
        setScanError('Item not required for this return');
        playBeep('error');
        return;
      }

      if (returnItem.qty_returned >= returnItem.qty_required) {
        setScanError('All units of this item already returned');
        playBeep('error');
        return;
      }

      // Update return quantity locally
      const updated = returnItems.map(item =>
        item.id === returnItem.id
          ? { ...item, qty_returned: item.qty_returned + 1 }
          : item
      );
      setReturnItems(updated);

      // Update warehouse inventory immediately
      const newQty = (inventoryItem.qty_in_warehouse || 0) + 1;
      await (supabase as any)
        .from('inventory_items')
        .update({
          qty_in_warehouse: newQty,
          location: 'Warehouse'
        })
        .eq('id', inventoryItem.id);

      playBeep('success');
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed');
      playBeep('error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="p-8 text-center">Loading return manifest...</div>;
  }

  const itemsByCategory = returnItems.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ReturnItem[]>);

  const categoriesToDisplay = CATEGORY_ORDER.filter(cat => itemsByCategory[cat]);
  const customCategories = Object.keys(itemsByCategory)
    .filter(cat => !CATEGORY_ORDER.includes(cat))
    .sort();
  const allCategories = [...categoriesToDisplay, ...customCategories];

  const totalRequired = returnItems.reduce((sum, item) => sum + item.qty_required, 0);
  const totalReturned = returnItems.reduce((sum, item) => sum + item.qty_returned, 0);
  const allComplete = totalRequired > 0 && totalReturned === totalRequired;

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
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">
              {error}
            </div>
          )}

          <BarcodeScanner 
            pullSheetId={jobId}
            onScan={handleScan}
          />

          {scanError && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {scanError}
            </div>
          )}
        </div>
      </div>

      {/* Return Manifest Sheet */}
      <div className="max-w-7xl mx-auto p-8 bg-white my-6 shadow-lg print:shadow-none print:my-0">
        {/* Header Section */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">RETURN MANIFEST</h1>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-semibold">Job Code: <span className="text-red-600">{job?.code || jobId}</span></div>
              <div className="text-lg font-semibold mt-1">{job?.title || 'Loading...'}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Return Date: {new Date().toLocaleDateString()}</div>
              <div className={`inline-block px-3 py-1 rounded text-xs font-semibold mt-1 ${
                allComplete ? 'bg-green-100 text-green-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {allComplete ? 'COMPLETE' : 'IN PROGRESS'}
              </div>
            </div>
          </div>
        </div>

        {/* Items by Category */}
        {allCategories.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-xl font-semibold">No items to return</p>
          </div>
        ) : (
          <>
            {allCategories.map(category => {
              const categoryItems = itemsByCategory[category] || [];
              return (
                <div key={category} className="mb-8 break-inside-avoid">
                  {/* Category Header */}
                  <div className="bg-gray-800 text-white px-3 py-2 font-bold text-sm mb-0">
                    {category.toUpperCase()}
                  </div>

                  {/* Category Items Table */}
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
                        const isComplete = item.qty_returned >= item.qty_required;
                        return (
                          <tr key={item.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="py-2 px-2 border-r border-gray-200 font-medium">{item.item_name}</td>
                            <td className="py-2 px-2 text-center border-r border-gray-200 font-semibold">{item.qty_required}</td>
                            <td className="py-2 px-2 text-center border-r border-gray-200 font-bold text-amber-600">{item.qty_returned}</td>
                            <td className="no-print py-2 px-2 text-center">
                              {isComplete ? (
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
              <div className="flex justify-between items-center">
                <div className="text-gray-600">
                  <div className="text-sm">Total Categories: {allCategories.length}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {totalReturned} / {totalRequired} Items Returned
                  </div>
                  <div className={`text-sm font-semibold mt-1 ${allComplete ? 'text-green-600' : 'text-amber-600'}`}>
                    {allComplete ? '✓ Return Complete' : `${totalRequired - totalReturned} items remaining`}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
