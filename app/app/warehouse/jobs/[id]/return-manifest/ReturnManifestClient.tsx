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
  notes?: string | null;
  barcode?: string;
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
  'Decking',
  'Pipe and Drape',
  'Power',
  'Misc',
  'Other'
];

// Subcategory mappings
const SUBCATEGORIES: Record<string, string[]> = {
  'Audio': ['Subs', 'Tops', 'Wedges', 'Columns', 'Microphones', 'Mixers', 'Processors', 'Amplifiers', 'Other Audio'],
  'Lighting': ['Uplights', 'Moving Heads', 'Strobes', 'Party Effects', 'Wash Lights', 'Hazers', 'Controllers', 'Other Lighting'],
  'Video': ['Projectors', 'Screens', 'LED Walls', 'Cameras', 'Switchers', 'Other Video'],
  'Stage': ['Stage Decks', 'Stairs', 'Railings', 'Skirting', 'Other Stage'],
  'Decking': ['Stage Decks', '4x8 Decks', '4x4 Decks', 'Risers', 'Legs', 'Other Decking'],
  'Pipe and Drape': ['Uprights', 'Bases', 'Crossbars', 'Drape', 'Other Pipe and Drape'],
  'Power': ['Distro', 'Cable', 'Edison', 'Cam-Lok', 'Generators', 'Other Power'],
  'Misc': ['Cases', 'Stands', 'Cables', 'Adapters', 'Tools', 'Other'],
  'Other': ['Uncategorized']
};

const getSubcategory = (itemName: string, category: string): string => {
  const name = itemName.toLowerCase();
  const subcats = SUBCATEGORIES[category] || [];
  
  // Audio speaker detection
  if (category === 'Audio' || category === 'Other') {
    // Subs - check before tops
    if (name.includes('b1-15') || name.includes('b112') || name.includes('b215') || 
        name.includes('sb') || name.includes('bass') ||
        name.includes('cd18') || name.includes('cd-18') || name.includes('cd 18') ||
        name.includes('subwoofer') || name.match(/\bsub\b/)) {
      return 'Subs';
    }
    // Tops/Speakers
    if (name.includes('arcs') || name.includes('kara') || name.includes('ks') || 
        name.includes('qsc') || name.includes('k12') || name.includes('k10') ||
        name.includes('srx') || name.includes('vrx') || name.includes('line array') ||
        name.includes('nexo') || name.includes('ps') || name.includes('geo') ||
        name.includes('eaw') || name.includes('kf650') || name.includes('kf-650')) {
      return 'Tops';
    }
    // Wedges
    if (name.includes('wedge') || name.includes('monitor')) {
      return 'Wedges';
    }
  }
  
  // Lighting detection
  if (category === 'Lighting' || category === 'Other') {
    if (name.includes('uplight') || name.includes('par can') || name.includes('par64')) {
      return 'Uplights';
    }
    if (name.includes('moving head') || name.includes('beam') || name.includes('spot')) {
      return 'Moving Heads';
    }
    if (name.includes('strobe')) {
      return 'Strobes';
    }
    if (name.includes('hazer') || name.includes('haze') || name.includes('fog')) {
      return 'Hazers';
    }
  }
  
  // Generic subcategory matching
  for (const subcat of subcats) {
    const subcatLower = subcat.toLowerCase();
    if (name.includes(subcatLower)) {
      return subcat;
    }
  }
  
  // Default subcategory
  if (category === 'Audio') return 'Other Audio';
  if (category === 'Lighting') return 'Other Lighting';
  
  return subcats[subcats.length - 1] || 'Other';
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORY_ORDER));
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // Expand all by default
    setExpandedCategories(new Set(CATEGORY_ORDER));
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

      // Store first pull sheet id
      if (pullSheets.length > 0) {
        setPullSheetId((pullSheets[0] as any).id);
      }

      // Load pull sheet items with inventory item details for barcodes
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
          inventory_items(barcode, name)
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
          barcode: item.inventory_items?.barcode || ''
        }));
        setReturnItems(items);
        
        // Auto-expand first category with items
        if (items.length > 0) {
          const firstCat = items[0].category;
          const firstSubcat = getSubcategory(items[0].item_name, firstCat);
          setExpandedSubcategories(new Set([`${firstCat}-${firstSubcat}`]));
        }
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
        item.item_name.toLowerCase() === invItem.name.toLowerCase() ||
        item.barcode === scan.barcode.trim()
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

      // Update warehouse inventory - RETURN the item to warehouse
      const { error } = await (supabase as any)
        .from('inventory_items')
        .update({
          qty_in_warehouse: (invItem.qty_in_warehouse || 0) + 1,
          location: 'Warehouse'
        })
        .eq('id', invItem.id);

      if (!error) {
        playBeep('success');
        setSelectedItemId(matchingItem.id);
        
        // Track to scan history if we have pull sheet id
        if (pullSheetId) {
          await (supabase as any)
            .from('pull_sheet_scans')
            .insert({
              pull_sheet_id: pullSheetId,
              pull_sheet_item_id: matchingItem.id,
              barcode: scan.barcode.trim(),
              item_name: matchingItem.item_name,
              scan_type: 'return'
            } as any);
        }
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed');
      playBeep('error');
    }
  };

  const handleUndoScan = async (itemId: string) => {
    const item = returnItems.find(i => i.id === itemId);
    if (!item || item.qty_returned === 0) return;

    try {
      // Find inventory item
      const { data: inventoryItem } = await supabase
        .from('inventory_items')
        .select('id, qty_in_warehouse')
        .ilike('name', item.item_name)
        .single();

      if (inventoryItem) {
        const invItem = inventoryItem as any;
        
        // Decrease warehouse qty by 1
        await supabase
          .from('inventory_items')
          .update({
            qty_in_warehouse: Math.max(0, (invItem.qty_in_warehouse || 0) - 1)
          })
          .eq('id', invItem.id);
      }

      // Update local state
      setReturnItems(prev =>
        prev.map(i =>
          i.id === itemId
            ? { ...i, qty_returned: Math.max(0, i.qty_returned - 1) }
            : i
        )
      );

      playBeep('success');
    } catch (err) {
      console.error('Undo error:', err);
      setScanError('Failed to undo scan');
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
        .eq("scan_type", "return")
        .order("scanned_at", { ascending: false })
        .limit(50);

      if (error) {
        console.warn("Scan history not available:", error);
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
      const signature = canvasRef.current?.toDataURL() || '';

      // Update pull sheets status to 'returned'
      await ((supabase as any)
        .from('pull_sheets')
        .update({
          status: 'returned',
          updated_at: new Date().toISOString()
        }) as any)
        .eq('job_id', jobId);

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
      await (supabase as any)
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
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  // Organize items by category and subcategory
  const itemsByCategory: Record<string, Record<string, ReturnItem[]>> = {};
  
  returnItems.forEach(item => {
    const category = item.category || 'Other';
    const subcategory = getSubcategory(item.item_name, category);
    
    if (!itemsByCategory[category]) {
      itemsByCategory[category] = {};
    }
    if (!itemsByCategory[category][subcategory]) {
      itemsByCategory[category][subcategory] = [];
    }
    itemsByCategory[category][subcategory].push(item);
  });

  // Filter items by search query
  const filteredItems = searchQuery.trim()
    ? returnItems.filter(item =>
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const totalRequired = returnItems.reduce((sum, item) => sum + item.qty_required, 0);
  const totalReturned = returnItems.reduce((sum, item) => sum + item.qty_returned, 0);
  const isComplete = totalRequired > 0 && totalReturned === totalRequired;
  const percentComplete = totalRequired > 0 ? Math.round((totalReturned / totalRequired) * 100) : 0;

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Top Bar */}
      <div className="no-print bg-zinc-800 border-b border-zinc-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
                <span className="font-medium">Back</span>
              </button>
              <div className="h-6 w-px bg-zinc-600" />
              <div>
                <h1 className="text-xl font-bold text-white">{job?.title || 'Return Manifest'}</h1>
                <p className="text-sm text-zinc-400">
                  Job #{job?.code} • {percentComplete}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadScanHistory}
                disabled={loadingScanHistory}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loadingScanHistory ? "Loading..." : "Scan History"}
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Printer size={18} />
                Print
              </button>
            </div>
          </div>

          {/* Scanner */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-700 p-4">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase mb-2">Quick Scan</h2>
            {scanError && (
              <div className="mb-3 p-2 bg-red-900/50 border border-red-700 rounded text-sm text-red-200">
                {scanError}
              </div>
            )}
            <BarcodeScanner pullSheetId={jobId} onScan={handleScan} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Search and Controls */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items, barcodes, notes..."
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-medium transition-colors"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Categories */}
        {CATEGORY_ORDER.map(category => {
          const categoryData = itemsByCategory[category];
          if (!categoryData || Object.keys(categoryData).length === 0) return null;

          const categoryItems = Object.values(categoryData).flat();
          const categoryReturned = categoryItems.reduce((sum, item) => sum + item.qty_returned, 0);
          const categoryRequired = categoryItems.reduce((sum, item) => sum + item.qty_required, 0);
          const categoryPercent = categoryRequired > 0 ? Math.round((categoryReturned / categoryRequired) * 100) : 0;
          const isExpanded = expandedCategories.has(category);

          return (
            <div key={category} className="mb-4 bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => {
                  const newExpanded = new Set(expandedCategories);
                  if (newExpanded.has(category)) {
                    newExpanded.delete(category);
                  } else {
                    newExpanded.add(category);
                  }
                  setExpandedCategories(newExpanded);
                }}
                className="w-full px-6 py-4 flex items-center justify-between bg-zinc-700 hover:bg-zinc-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
                  <h2 className="text-lg font-bold text-white uppercase">{category}</h2>
                  <span className="text-sm text-zinc-400">({Object.keys(categoryData).length} items)</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-zinc-400">
                    {categoryReturned} / {categoryRequired} • {categoryPercent}%
                  </span>
                  {categoryPercent === 100 && (
                    <span className="text-green-400 font-bold">✓</span>
                  )}
                </div>
              </button>

              {/* Subcategories */}
              {isExpanded && Object.entries(categoryData).map(([subcategory, subcatItems]) => {
                const subcatKey = `${category}-${subcategory}`;
                const isSubcatExpanded = expandedSubcategories.has(subcatKey);
                const subcatReturned = subcatItems.reduce((sum, item) => sum + item.qty_returned, 0);
                const subcatRequired = subcatItems.reduce((sum, item) => sum + item.qty_required, 0);

                return (
                  <div key={subcatKey} className="border-t border-zinc-700">
                    {/* Subcategory Header */}
                    <button
                      onClick={() => {
                        const newExpanded = new Set(expandedSubcategories);
                        if (newExpanded.has(subcatKey)) {
                          newExpanded.delete(subcatKey);
                        } else {
                          newExpanded.add(subcatKey);
                        }
                        setExpandedSubcategories(newExpanded);
                      }}
                      className="w-full px-6 py-3 flex items-center justify-between bg-zinc-800 hover:bg-zinc-750 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-zinc-400">{isSubcatExpanded ? '▼' : '▶'}</span>
                        <h3 className="font-semibold text-white">{subcategory}</h3>
                        <span className="text-xs text-zinc-500">({subcatItems.length})</span>
                      </div>
                      <span className="text-sm text-zinc-400">
                        {subcatReturned} / {subcatRequired}
                      </span>
                    </button>

                    {/* Items Table */}
                    {isSubcatExpanded && (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-zinc-900">
                            <tr className="border-b border-zinc-700">
                              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase w-20">QTY</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">DESCRIPTION</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase w-48">NOTES</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase w-32">BARCODE</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-700">
                            {subcatItems.map((item) => {
                              const isItemComplete = item.qty_returned >= item.qty_required;
                              const isSelected = selectedItemId === item.id;

                              return (
                                <tr
                                  key={item.id}
                                  onClick={() => setSelectedItemId(item.id)}
                                  className={`transition-colors cursor-pointer hover:bg-zinc-700/50 ${
                                    isSelected ? 'bg-amber-500/20 border-l-4 border-amber-400' : ''
                                  }`}
                                >
                                  <td className="px-4 py-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1 text-sm font-mono">
                                        <span className={isItemComplete ? 'text-green-400 font-bold' : 'text-white font-bold'}>
                                          {item.qty_returned}
                                        </span>
                                        <span className="text-zinc-500">/</span>
                                        <span className="text-zinc-400">{item.qty_required}</span>
                                      </div>
                                      {isSelected && item.qty_returned > 0 && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleUndoScan(item.id);
                                          }}
                                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                                          title="Undo last scan"
                                        >
                                          ↶
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-white font-medium">{item.item_name}</td>
                                  <td className="px-4 py-3 text-zinc-400 text-sm">{item.notes || '—'}</td>
                                  <td className="px-4 py-3 text-zinc-400 text-xs font-mono">{item.barcode || '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Finalize Button */}
        {isComplete && (
          <div className="mt-6 p-6 bg-green-900/20 border-2 border-green-500 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-green-300 mb-1">✓ Return Complete!</h3>
                <p className="text-zinc-400">All {totalRequired} items have been returned to the warehouse.</p>
              </div>
              <button
                onClick={() => setShowFinalizePrompt(true)}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
              >
                Finalize & Archive Job
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Scan History Modal */}
      {showScanHistory && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 no-print">
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4 text-white">Return Scan History</h2>
            
            {scanHistory.length === 0 ? (
              <div className="text-center py-8 text-zinc-400">
                No scans recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-700">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-zinc-300">Item</th>
                      <th className="px-4 py-2 text-left font-medium text-zinc-300">Barcode</th>
                      <th className="px-4 py-2 text-left font-medium text-zinc-300">Time</th>
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

            <button
              onClick={() => setShowScanHistory(false)}
              className="mt-6 w-full bg-zinc-700 text-white px-4 py-2 rounded-lg hover:bg-zinc-600 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Finalize Modal */}
      {showFinalizePrompt && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 no-print">
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-white">Finalize Return</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Your Name *</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full bg-zinc-900 border border-zinc-600 rounded px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>

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

              <div className="bg-zinc-900 border border-zinc-700 p-4 rounded">
                <h3 className="font-semibold text-white mb-2">Summary</h3>
                <div className="text-sm text-zinc-300 space-y-1">
                  <div>Job: <span className="font-semibold text-amber-400">{job?.code}</span> - {job?.title}</div>
                  <div>Items: <span className="font-semibold text-green-400">{totalReturned} / {totalRequired}</span></div>
                  <div>Status: <span className="font-semibold text-green-400">Complete</span></div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowFinalizePrompt(false)}
                disabled={finalizing}
                className="flex-1 bg-zinc-700 text-white px-4 py-2 rounded-lg hover:bg-zinc-600 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalize}
                disabled={finalizing || !userName.trim()}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
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
