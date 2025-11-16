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

      // Load pull sheet items for this job
      const { data: itemsData } = await supabase
        .from("pull_sheet_items")
        .select("id, item_name, qty_requested, category")
        .eq("job_id", jobId);

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
      const { error } = await supabase
        .from('inventory_items')
        .update({
          qty_in_warehouse: (invItem.qty_in_warehouse || 0) + 1,
          location: 'Warehouse'
        } as any)
        .eq('id', invItem.id);

      if (!error) {
        playBeep('success');
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed');
      playBeep('error');
    }
  };

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
          <div className="flex justify-between items-center">
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
        </div>
      </div>
    </div>
  );
}
