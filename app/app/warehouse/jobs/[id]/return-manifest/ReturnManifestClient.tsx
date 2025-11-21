'use client';
// @ts-nocheck

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import BarcodeScanner from '@/components/BarcodeScanner';

type Item = {
  id: string;
  inventory_item_id?: string | null;
  item_name?: string;
  qty_requested?: number;
  qty_returned?: number;
  notes?: string | null;
  scanned_barcodes?: string[]; // Track all scanned barcodes for this item
  inventory_items?: {
    barcode?: string;
    name?: string;
    category?: string;
    gear_type?: string;
    image_url?: string;
    is_quantity_item?: boolean;
  };
};

type Job = {
  id: string;
  code: string;
  title: string;
};

type ScanHistoryItem = {
  id: string;
  item_name: string;
  barcode: string;
  scanned_at: string;
  inventory_items?: {
    name?: string;
    barcode?: string;
    category?: string;
    image_url?: string;
  };
  created_at?: string;
};

const CATEGORIES = ['AUDIO', 'LIGHTING', 'VIDEO', 'STAGE', 'DECKING', 'PIPE AND DRAPE', 'POWER', 'MISC', 'OTHER'];

// Subcategory mappings
const SUBCATEGORIES: Record<string, string[]> = {
  'AUDIO': ['Mixers', 'Speakers', 'Tops', 'Subs', 'Wedges', 'Columns', 'Microphones', 'DI Boxes', 'Processors', 'Amplifiers', 'Other Audio'],
  'LIGHTING': ['Uplights', 'Moving Heads', 'Strobes', 'Party Effects', 'Wash Lights', 'Par Cans', 'LED Panels', 'Hazers', 'Controllers', 'Other Lighting'],
  'VIDEO': ['Projectors', 'Screens', 'LED Walls', 'Cameras', 'Switchers', 'Scalers', 'Other Video'],
  'STAGE': ['Stage Decks', 'Stairs', 'Railings', 'Skirting', 'Other Stage'],
  'DECKING': ['Stage Decks', '4x8 Decks', '4x4 Decks', 'Risers', 'Legs', 'Other Decking'],
  'PIPE AND DRAPE': ['Uprights', 'Bases', 'Crossbars', 'Drape', 'Other Pipe and Drape'],
  'POWER': ['Distro', 'Cable', 'Edison', 'Cam-Lok', 'Generators', 'Other Power'],
  'MISC': ['Cases', 'Stands', 'Cables', 'Adapters', 'Tools', 'Other'],
  'OTHER': ['Uncategorized']
};

const getSubcategory = (itemName: string, category: string): string => {
  const name = itemName.toLowerCase();
  const subcats = SUBCATEGORIES[category] || [];
  
  if (category === 'AUDIO' || category === 'OTHER') {
    if (name.includes('b1-15') || name.includes('b112') || name.includes('b215') || 
        name.includes('sb') || name.includes('bass') ||
        name.includes('cd18') || name.includes('cd-18') || name.includes('cd 18') ||
        name.includes('subwoofer') || name.match(/\bsub\b/)) {
      return 'Subs';
    }
    if (name.includes('arcs') || name.includes('kara') || name.includes('ks') || 
        name.includes('qsc') || name.includes('k12') || name.includes('k10') ||
        name.includes('srx') || name.includes('vrx') || name.includes('line array') ||
        name.includes('nexo') || name.includes('ps') || name.includes('geo') ||
        name.includes('eaw') || name.includes('kf650') || name.includes('kf-650')) {
      return 'Tops';
    }
    if (name.includes('wedge') || name.includes('monitor')) {
      return 'Wedges';
    }
  }
  
  if (category === 'LIGHTING' || category === 'OTHER') {
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
  
  for (const subcat of subcats) {
    if (name.includes(subcat.toLowerCase())) {
      return subcat;
    }
  }
  
  if (category === 'AUDIO') return 'Other Audio';
  if (category === 'LIGHTING') return 'Other Lighting';
  
  return subcats[subcats.length - 1] || 'Other';
};

// Sound feedback functions
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

const playVoice = (type: "success" | "error", config?: { successMessage: string, errorMessage: string, volume: number, rate: number, pitch: number }) => {
  try {
    const utterance = new SpeechSynthesisUtterance(
      type === "success" ? (config?.successMessage || "Scan successful") : (config?.errorMessage || "Nope, try again")
    );
    
    // Try to find a female voice
    const voices = speechSynthesis.getVoices();
    const femaleVoice = voices.find(voice => 
      voice.name.toLowerCase().includes('female') || 
      voice.name.toLowerCase().includes('woman') ||
      voice.name.toLowerCase().includes('samantha') ||
      voice.name.toLowerCase().includes('victoria') ||
      voice.name.toLowerCase().includes('zira')
    );
    
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    
    utterance.rate = config?.rate || 1.1;
    utterance.pitch = config?.pitch || 1.2;
    utterance.volume = config?.volume || 0.8;
    
    speechSynthesis.speak(utterance);
  } catch (e) {
    console.error('Voice synthesis failed:', e);
  }
};

const playSound = (type: "success" | "error", soundTheme: 'ding' | 'voice', config?: { successMessage: string, errorMessage: string, volume: number, rate: number, pitch: number, enableSuccess: boolean, enableError: boolean }) => {
  // Check if the sound is enabled
  if (type === 'success' && config?.enableSuccess === false) return;
  if (type === 'error' && config?.enableError === false) return;
  
  if (soundTheme === 'voice') {
    playVoice(type, config);
  } else {
    playBeep(type);
  }
};

export default function ReturnManifestClient({ jobId, pullSheetId: propPullSheetId }: { jobId: string, pullSheetId?: string }) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [pullSheetId, setPullSheetId] = useState<string | null>(propPullSheetId || null);
  const [lastScan, setLastScan] = useState<ScanHistoryItem | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [view, setView] = useState<'scanhistory' | 'pullsheet' | 'manifest'>('pullsheet');
  const [soundTheme, setSoundTheme] = useState<'ding' | 'voice'>('ding');
  const [pullSheetWidth, setPullSheetWidth] = useState(60);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [columnWidths, setColumnWidths] = useState({
    qty: 80,
    description: 300,
    notes: 200
  });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
  const [quantityInputItemId, setQuantityInputItemId] = useState<string | null>(null);
  const [quantityInputValue, setQuantityInputValue] = useState('');
  const [showScanPromptsConfig, setShowScanPromptsConfig] = useState(false);
  
  // Scan prompt settings
  const [scanPrompts, setScanPrompts] = useState({
    successMessage: 'Scan successful',
    errorMessage: 'Nope, try again',
    volume: 0.8,
    rate: 1.1,
    pitch: 1.2,
    enableSuccess: true,
    enableError: true
  });

  // Load voices on mount for speech synthesis and load saved scan prompt settings
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Force load voices
      speechSynthesis.getVoices();
      // Some browsers need this event
      speechSynthesis.onvoiceschanged = () => {
        speechSynthesis.getVoices();
      };
    }

    // Load saved scan prompt settings
    const savedPrompts = localStorage.getItem('scanPromptSettings');
    if (savedPrompts) {
      try {
        const parsed = JSON.parse(savedPrompts);
        setScanPrompts(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to load scan prompt settings:', e);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [jobId]);

  useEffect(() => {
    if (pullSheetId) {
      fetchScanHistory();
    }
  }, [pullSheetId]);

  async function loadData() {
    try {
      setLoading(true);

      const { data: jobData } = await supabase
        .from("jobs")
        .select("id, code, title")
        .eq("id", jobId)
        .single();

      if (jobData) {
        setJob(jobData as any);
      }

      const { data: pullSheets } = await supabase
        .from("pull_sheets")
        .select("id")
        .eq("job_id", jobId);

      if (!pullSheets || pullSheets.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const psId = (pullSheets[0] as any).id;
      setPullSheetId(psId);

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
          inventory_items(barcode, name, image_url, category, gear_type, is_quantity_item)
        `)
        .in("pull_sheet_id", pullSheetIds);

      if (itemsData) {
        // Load scanned barcodes for each item from pull_sheet_scans
        const { data: scansData } = await supabase
          .from('pull_sheet_scans')
          .select('pull_sheet_item_id, barcode, scan_type')
          .eq('pull_sheet_id', psId)
          .eq('scan_type', 'pull');
        
        // Group barcodes by item
        const barcodesByItem: Record<string, string[]> = {};
        if (scansData) {
          scansData.forEach((scan: any) => {
            if (!barcodesByItem[scan.pull_sheet_item_id]) {
              barcodesByItem[scan.pull_sheet_item_id] = [];
            }
            barcodesByItem[scan.pull_sheet_item_id].push(scan.barcode);
          });
        }

        const mappedItems: Item[] = itemsData.map((item: any) => ({
          id: item.id,
          item_name: item.item_name || item.inventory_items?.name || 'Unknown',
          qty_requested: item.qty_requested || 0,
          qty_returned: 0,
          notes: item.notes,
          inventory_item_id: item.inventory_item_id,
          inventory_items: item.inventory_items,
          scanned_barcodes: barcodesByItem[item.id] || []
        }));
        setItems(mappedItems);
        
        if (mappedItems.length > 0) {
          const firstCat = (mappedItems[0].inventory_items?.category || 'OTHER').toUpperCase();
          setExpandedCategories(new Set([firstCat]));
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchScanHistory() {
    if (!pullSheetId) return;
    
    const { data } = await supabase
      .from('pull_sheet_scans')
      .select(`
        *,
        inventory_items (
          name,
          barcode,
          category,
          gear_type,
          image_url
        )
      `)
      .eq('pull_sheet_id', pullSheetId)
      .eq('scan_type', 'return')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data && data.length > 0) {
      setScanHistory(data as any);
      setLastScan(data[0] as any);
    }
  }

  async function handleScan(scan: any) {
    if (!scan?.barcode || !pullSheetId) return;

    try {
      const { data: inventoryItem } = await supabase
        .from('inventory_items')
        .select('id, name, qty_in_warehouse, image_url, barcode, category, is_quantity_item')
        .eq('barcode', scan.barcode.trim())
        .single();

      if (!inventoryItem) {
        playSound('error', soundTheme, scanPrompts);
        return;
      }

      const invItem = inventoryItem as any;
      
      // Find matching item - must have this barcode in scanned_barcodes
      const matchingItem = items.find(item =>
        item.scanned_barcodes?.includes(scan.barcode.trim())
      );

      if (!matchingItem) {
        playSound('error', soundTheme, scanPrompts);
        return;
      }

      if ((matchingItem.qty_returned || 0) >= (matchingItem.qty_requested || 0)) {
        playSound('error', soundTheme, scanPrompts);
        return;
      }

      setSaving(true);

      setItems(prev =>
        prev.map(item =>
          item.id === matchingItem.id
            ? { ...item, qty_returned: (item.qty_returned || 0) + 1 }
            : item
        )
      );

      await supabase
        .from('inventory_items')
        .update({
          qty_in_warehouse: (invItem.qty_in_warehouse || 0) + 1,
          location: 'Warehouse'
        })
        .eq('id', invItem.id);

      const { data: scanRecord } = await supabase
        .from('pull_sheet_scans')
        .insert({
          pull_sheet_id: pullSheetId,
          pull_sheet_item_id: matchingItem.id,
          barcode: scan.barcode.trim(),
          item_name: matchingItem.item_name,
          scan_type: 'return',
          inventory_item_id: invItem.id
        })
        .select(`
          *,
          inventory_items (
            name,
            barcode,
            category,
            image_url
          )
        `)
        .single();

      if (scanRecord) {
        setLastScan(scanRecord as any);
        setScanHistory(prev => [scanRecord as any, ...prev]);
      }

      setSelectedItemId(matchingItem.id);
      playSound('success', soundTheme, scanPrompts);
    } catch (err) {
      console.error('Scan error:', err);
      playSound('error', soundTheme, scanPrompts);
    } finally {
      setSaving(false);
    }
  }

  async function handleQuantityReturn(itemId: string, quantity: number) {
    const item = items.find(i => i.id === itemId);
    if (!item || !item.inventory_items?.is_quantity_item) return;

    const maxReturn = (item.qty_requested || 0) - (item.qty_returned || 0);
    const qtyToReturn = Math.min(quantity, maxReturn);

    if (qtyToReturn <= 0) return;

    try {
      setSaving(true);

      setItems(prev =>
        prev.map(i =>
          i.id === itemId
            ? { ...i, qty_returned: (i.qty_returned || 0) + qtyToReturn }
            : i
        )
      );

      // Update warehouse inventory
      const { data: inventoryItem } = await supabase
        .from('inventory_items')
        .select('id, qty_in_warehouse')
        .eq('id', item.inventory_item_id)
        .single();

      if (inventoryItem) {
        const invItem = inventoryItem as any;
        await supabase
          .from('inventory_items')
          .update({
            qty_in_warehouse: (invItem.qty_in_warehouse || 0) + qtyToReturn,
            location: 'Warehouse'
          })
          .eq('id', invItem.id);
      }

      // Record the return
      await supabase
        .from('pull_sheet_scans')
        .insert({
          pull_sheet_id: pullSheetId,
          pull_sheet_item_id: itemId,
          barcode: `QUANTITY-${qtyToReturn}`,
          item_name: item.item_name,
          scan_type: 'return',
          inventory_item_id: item.inventory_item_id
        });

      setQuantityInputItemId(null);
      setQuantityInputValue('');
    } catch (err) {
      console.error('Quantity return error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleUndoScan(itemId: string) {
    const item = items.find(i => i.id === itemId);
    if (!item || (item.qty_returned || 0) === 0) return;

    try {
      setSaving(true);

      const { data: inventoryItem } = await supabase
        .from('inventory_items')
        .select('id, qty_in_warehouse')
        .eq('id', item.inventory_item_id)
        .single();

      if (inventoryItem) {
        const invItem = inventoryItem as any;
        await supabase
          .from('inventory_items')
          .update({
            qty_in_warehouse: Math.max(0, (invItem.qty_in_warehouse || 0) - 1)
          })
          .eq('id', invItem.id);
      }

      setItems(prev =>
        prev.map(i =>
          i.id === itemId
            ? { ...i, qty_returned: Math.max(0, (i.qty_returned || 0) - 1) }
            : i
        )
      );
    } catch (err) {
      console.error('Undo error:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateNotes(itemId: string, notes: string) {
    setItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, notes } : item
      )
    );

    await supabase
      .from('pull_sheet_items')
      .update({ notes })
      .eq('id', itemId);
  }

  function handleItemClick(itemId: string) {
    setSelectedItemId(selectedItemId === itemId ? null : itemId);
  }

  const totalRequested = items.reduce((sum, item) => sum + (item.qty_requested || 0), 0);
  const totalReturned = items.reduce((sum, item) => sum + (item.qty_returned || 0), 0);
  const progress = totalRequested > 0 ? Math.round((totalReturned / totalRequested) * 100) : 0;

  const itemsByCategory: Record<string, Record<string, Item[]>> = {};
  items.forEach(item => {
    const cat = (item.inventory_items?.category || 'OTHER').toUpperCase();
    const subcat = getSubcategory(item.inventory_items?.name || item.item_name || '', cat);
    
    if (!itemsByCategory[cat]) itemsByCategory[cat] = {};
    if (!itemsByCategory[cat][subcat]) itemsByCategory[cat][subcat] = [];
    itemsByCategory[cat][subcat].push(item);
  });

  if (loading) {
    return (
      <div className="h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900 text-white">
      {/* Top Header */}
      <div className="bg-zinc-800 border-b border-zinc-700 flex-shrink-0">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="border-2 border-zinc-600 rounded px-4 py-2 bg-zinc-750">
            <h1 className="text-lg font-bold text-white">
              {job?.title || 'Return Manifest'}
              {job?.code && (
                <span className="text-sm text-zinc-400 ml-3">Job #{job.code}</span>
              )}
            </h1>
          </div>

          <div className="px-6 py-2 border-2 border-zinc-600 rounded-lg bg-zinc-800">
            <div className="text-2xl font-bold text-white tabular-nums">
              {progress}%
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-8 w-px bg-zinc-600"></div>
            <div className="text-white font-semibold text-sm">Last Scan</div>
          </div>
        </div>

        <div className="h-3 bg-zinc-700">
          <div 
            className="h-full bg-blue-500 transition-all duration-500 shadow-lg shadow-blue-500/50"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center border-t border-zinc-700">
          <div className="flex gap-2 px-6 py-2">
            <button
              onClick={() => setView('scanhistory')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === 'scanhistory' 
                  ? 'bg-amber-400 text-black' 
                  : 'bg-zinc-700 text-white hover:bg-zinc-600'
              }`}
            >
              Scan History
            </button>
            <button
              onClick={() => setView('pullsheet')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === 'pullsheet' 
                  ? 'bg-amber-400 text-black' 
                  : 'bg-zinc-700 text-white hover:bg-zinc-600'
              }`}
            >
              Pull Sheet
            </button>
            <button
              onClick={() => setView('manifest')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === 'manifest' 
                  ? 'bg-amber-400 text-black' 
                  : 'bg-zinc-700 text-white hover:bg-zinc-600'
              }`}
            >
              Manifest
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div 
          className="overflow-y-auto overflow-x-hidden scrollbar-hide"
          style={{ width: `${pullSheetWidth}%` }}
        >
          <style jsx>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>

          <div className="p-3 border-b border-zinc-700 bg-zinc-800">
            <BarcodeScanner
              pullSheetId={pullSheetId || ''}
              soundTheme={soundTheme}
              onScan={handleScan}
            />
          </div>

          {view === 'pullsheet' && (
            <div className="p-4 space-y-3">
              {CATEGORIES.map(category => {
                const categoryData = itemsByCategory[category];
                if (!categoryData || Object.keys(categoryData).length === 0) return null;

                const isExpanded = expandedCategories.has(category);
                const categoryItems = Object.values(categoryData).flat();
                const catReturned = categoryItems.reduce((sum, item) => sum + (item.qty_returned || 0), 0);
                const catRequested = categoryItems.reduce((sum, item) => sum + (item.qty_requested || 0), 0);

                return (
                  <div key={category} className="bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700">
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
                      className="w-full px-4 py-3 flex items-center justify-between bg-zinc-700/50 hover:bg-zinc-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-400">{isExpanded ? '▼' : '▶'}</span>
                        <span className="text-sm font-bold text-white">{category}</span>
                      </div>
                      <div className="text-sm text-zinc-400 font-mono">
                        {catReturned} / {catRequested}
                      </div>
                    </button>

                    {isExpanded && Object.entries(categoryData).map(([subcat, subcatItems]) => {
                      const subcatKey = `${category}-${subcat}`;
                      const isSubcatExpanded = expandedSubcategories.has(subcatKey);

                      return (
                        <div key={subcatKey} className="border-t border-zinc-700">
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
                            className="w-full px-6 py-2 flex items-center justify-between bg-zinc-800 hover:bg-zinc-750 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-500">{isSubcatExpanded ? '▼' : '▶'}</span>
                              <span className="text-xs font-semibold text-zinc-300">{subcat}</span>
                            </div>
                          </button>

                          {isSubcatExpanded && (
                            <div className="bg-zinc-900">
                              <table className="w-full text-sm">
                                <thead className="bg-zinc-800 border-b border-zinc-700">
                                  <tr>
                                    <th 
                                      className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase border-r border-zinc-600 relative"
                                      style={{ width: `${columnWidths.qty}px` }}
                                    >
                                      QTY
                                    </th>
                                    <th 
                                      className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase border-r border-zinc-600 relative"
                                      style={{ width: `${columnWidths.description}px` }}
                                    >
                                      DESCRIPTION
                                    </th>
                                    <th 
                                      className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase"
                                      style={{ width: `${columnWidths.notes}px` }}
                                    >
                                      NOTES
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-700">
                                  {subcatItems.map((item: Item) => {
                                    const itemName = item.inventory_items?.name || item.item_name || 'Unknown Item';
                                    const returned = item.qty_returned || 0;
                                    const requested = item.qty_requested || 0;
                                    const isComplete = returned >= requested;
                                    const isSelected = selectedItemId === item.id;
                                    const isQuantityItem = item.inventory_items?.is_quantity_item;
                                    const showQuantityInput = quantityInputItemId === item.id;

                                    return (
                                      <tr 
                                        key={item.id} 
                                        onDoubleClick={() => {
                                          if (isQuantityItem && !isComplete) {
                                            setQuantityInputItemId(item.id);
                                            setQuantityInputValue('');
                                          }
                                        }}
                                        onClick={() => handleItemClick(item.id)}
                                        className={`transition-colors cursor-pointer hover:bg-zinc-800/50 ${
                                          isSelected ? 'bg-amber-500/20 border-l-4 border-amber-400' : ''
                                        }`}
                                      >
                                        <td 
                                          className="px-4 py-3 border-r border-zinc-700"
                                          style={{ width: `${columnWidths.qty}px` }}
                                        >
                                          {showQuantityInput ? (
                                            <input
                                              type="number"
                                              value={quantityInputValue}
                                              onChange={(e) => setQuantityInputValue(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  const qty = parseInt(quantityInputValue);
                                                  if (qty > 0) {
                                                    handleQuantityReturn(item.id, qty);
                                                  }
                                                } else if (e.key === 'Escape') {
                                                  setQuantityInputItemId(null);
                                                  setQuantityInputValue('');
                                                }
                                              }}
                                              onBlur={() => {
                                                setQuantityInputItemId(null);
                                                setQuantityInputValue('');
                                              }}
                                              onClick={(e) => e.stopPropagation()}
                                              autoFocus
                                              className="w-16 px-2 py-1 bg-zinc-700 border border-amber-400 rounded text-white text-sm font-mono focus:outline-none"
                                              placeholder="Qty"
                                            />
                                          ) : (
                                            <div className="flex items-center justify-between gap-2">
                                              <div className="flex items-center gap-1 text-sm font-mono">
                                                <span className={isComplete ? 'text-green-400 font-bold' : 'text-white font-bold'}>{returned}</span>
                                                <span className="text-zinc-500">/</span>
                                                <span className="text-zinc-400">{requested}</span>
                                              </div>
                                              {isSelected && returned > 0 && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUndoScan(item.id);
                                                  }}
                                                  disabled={saving}
                                                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded disabled:opacity-50"
                                                  title="Undo last scan"
                                                >
                                                  ↶ Undo
                                                </button>
                                              )}
                                            </div>
                                          )}
                                        </td>
                                        <td 
                                          className="px-4 py-3 border-r border-zinc-700"
                                          style={{ width: `${columnWidths.description}px` }}
                                        >
                                          <div className="text-white font-medium">{itemName}</div>
                                          {isQuantityItem && (
                                            <div className="text-xs text-amber-400 mt-0.5">Double-tap to enter qty</div>
                                          )}
                                        </td>
                                        <td 
                                          className="px-4 py-3"
                                          style={{ width: `${columnWidths.notes}px` }}
                                        >
                                          <input
                                            type="text"
                                            value={item.notes || ''}
                                            onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            placeholder="Add notes..."
                                            className="w-full bg-transparent border-none text-zinc-300 text-xs focus:outline-none focus:text-white placeholder-zinc-600"
                                          />
                                        </td>
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
            </div>
          )}

          {view === 'scanhistory' && (
            <div className="p-4 space-y-3">
              {scanHistory.length === 0 ? (
                <div className="text-center text-zinc-500 py-12">
                  <div className="text-4xl mb-4">📋</div>
                  <div>No scans yet</div>
                </div>
              ) : (
                scanHistory.map((scan: any) => (
                  <div key={scan.id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      {scan.inventory_items?.image_url && (
                        <img 
                          src={scan.inventory_items.image_url} 
                          alt={scan.inventory_items.name || 'Item'}
                          className="w-16 h-16 object-cover rounded border border-zinc-600"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-semibold text-white">{scan.inventory_items?.name || scan.item_name}</div>
                        <div className="text-xs text-zinc-400 font-mono mt-1">{scan.barcode}</div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {scan.created_at ? new Date(scan.created_at).toLocaleString() : 'Recently'}
                        </div>
                      </div>
                      <div className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 font-semibold">
                        RETURN
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {view === 'manifest' && (
            <div className="p-4 space-y-4 overflow-y-auto">
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Return Manifest</h3>
                <div className="text-sm text-zinc-400 mb-4">
                  Showing all barcodes that were scanned when pulling this job
                </div>
                <div className="space-y-3">
                  {items.map(item => {
                    const itemName = item.inventory_items?.name || item.item_name || 'Unknown';
                    const returned = item.qty_returned || 0;
                    const requested = item.qty_requested || 0;
                    const isComplete = returned >= requested;
                    const scannedBarcodes = item.scanned_barcodes || [];
                    
                    return (
                      <div 
                        key={item.id} 
                        className={`p-4 rounded-lg border transition-colors ${
                          isComplete 
                            ? 'bg-green-500/10 border-green-500/50' 
                            : 'bg-zinc-750 border-zinc-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-medium text-white text-lg">{itemName}</div>
                            <div className="text-xs text-zinc-500 mt-1">
                              {scannedBarcodes.length > 0 ? (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {scannedBarcodes.map((barcode, idx) => (
                                    <span 
                                      key={idx} 
                                      className="px-2 py-1 bg-zinc-700 rounded font-mono text-xs text-zinc-300"
                                    >
                                      {barcode}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-zinc-500">No barcodes scanned</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-sm text-zinc-400">Quantity</div>
                            <div className="text-2xl font-bold font-mono">
                              <span className={isComplete ? 'text-green-400' : 'text-white'}>{returned}</span>
                              <span className="text-zinc-500">/</span>
                              <span className="text-zinc-400">{requested}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resize Divider */}
        <div 
          className="w-px bg-zinc-600 hover:bg-amber-400 cursor-col-resize transition-colors relative group"
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startWidth = pullSheetWidth;
            
            const handleMouseMove = (e: MouseEvent) => {
              const delta = e.clientX - startX;
              const newWidth = Math.max(30, Math.min(70, startWidth + (delta / window.innerWidth) * 100));
              setPullSheetWidth(newWidth);
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        >
          <div className="absolute inset-y-0 -left-1 -right-1 w-2"></div>
          <div className="w-1 h-12 bg-zinc-500 group-hover:bg-amber-300 rounded-full"></div>
        </div>

        {/* Right Panel: Last Scan */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-6 overflow-y-auto scrollbar-hide">
            <style jsx>{`
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
              .scrollbar-hide {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}</style>
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
              {lastScan ? (
                <div className="space-y-4">
                  <div className="w-full aspect-square bg-zinc-700 rounded-lg flex items-center justify-center overflow-hidden">
                    {lastScan.inventory_items?.image_url ? (
                      <img 
                        src={lastScan.inventory_items.image_url} 
                        alt={lastScan.inventory_items?.name || 'Item'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-zinc-500">
                        <div className="text-sm">No Image Available</div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-sm text-zinc-400 mb-1">Item</div>
                    <div className="text-lg font-semibold text-white">
                      {lastScan.inventory_items?.name || lastScan.item_name || 'Unknown'}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-zinc-400 mb-1">Barcode</div>
                    <div className="text-sm font-mono text-white">
                      {lastScan.barcode || '-'}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-zinc-400 mb-1">Location</div>
                    <div className="text-lg font-semibold text-white">{job?.title || 'Return'}</div>
                  </div>

                  <div>
                    <div className="text-sm text-zinc-400 mb-1">Scanned</div>
                    <div className="text-sm text-zinc-300">
                      {lastScan.created_at ? new Date(lastScan.created_at).toLocaleTimeString() : 'Just now'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-zinc-500 py-12">
                  <div className="text-4xl mb-4">🔍</div>
                  <div>No scans yet</div>
                  <div className="text-sm mt-2">Scan an item to see details</div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-6 space-y-3 border-t border-zinc-700">
            <button
              onClick={() => router.push(`/app/warehouse/jobs/${jobId}`)}
              className="w-full px-4 py-3 bg-zinc-700 text-white rounded-lg font-medium hover:bg-zinc-600 transition-colors"
            >
              View Job
            </button>
            <button
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              📄 Print Manifest PDF
            </button>
            <button
              className="w-full px-4 py-3 bg-zinc-700 text-white rounded-lg font-medium hover:bg-zinc-600 transition-colors"
            >
              Share
            </button>
            <button
              onClick={loadData}
              className="w-full px-4 py-3 bg-amber-400 text-black rounded-lg font-semibold hover:bg-amber-500 transition-colors"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-zinc-800 border-t border-zinc-700 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-zinc-700 text-white rounded text-sm hover:bg-zinc-600 flex items-center gap-2"
          >
            ← Back
          </button>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Sound Theme:</span>
            <button
              onClick={() => setSoundTheme(soundTheme === 'ding' ? 'voice' : 'ding')}
              className="px-3 py-1 bg-zinc-700 text-white rounded text-sm hover:bg-zinc-600"
            >
              {soundTheme === 'ding' ? '🔔 Ding' : '🗣️ Voice'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Scan Prompts:</span>
            <button 
              onClick={() => setShowScanPromptsConfig(true)}
              className="px-3 py-1 bg-zinc-700 text-white rounded text-sm hover:bg-zinc-600"
            >
              Configure
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* Scan Prompts Configuration Modal */}
      {showScanPromptsConfig && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-4">Scan Prompt Settings</h2>
            
            <div className="space-y-4">
              {/* Success Message */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Success Message</label>
                <input
                  type="text"
                  value={scanPrompts.successMessage}
                  onChange={(e) => setScanPrompts(prev => ({ ...prev, successMessage: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-zinc-500"
                  placeholder="Scan successful"
                />
              </div>

              {/* Error Message */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Error Message</label>
                <input
                  type="text"
                  value={scanPrompts.errorMessage}
                  onChange={(e) => setScanPrompts(prev => ({ ...prev, errorMessage: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:border-zinc-500"
                  placeholder="Nope, try again"
                />
              </div>

              {/* Volume */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Volume: {Math.round(scanPrompts.volume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={scanPrompts.volume}
                  onChange={(e) => setScanPrompts(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>

              {/* Rate/Speed */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Speed: {scanPrompts.rate.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={scanPrompts.rate}
                  onChange={(e) => setScanPrompts(prev => ({ ...prev, rate: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>

              {/* Pitch */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Pitch: {scanPrompts.pitch.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={scanPrompts.pitch}
                  onChange={(e) => setScanPrompts(prev => ({ ...prev, pitch: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>

              {/* Enable Toggles */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-zinc-400">
                  <input
                    type="checkbox"
                    checked={scanPrompts.enableSuccess}
                    onChange={(e) => setScanPrompts(prev => ({ ...prev, enableSuccess: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  Enable success sounds
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-400">
                  <input
                    type="checkbox"
                    checked={scanPrompts.enableError}
                    onChange={(e) => setScanPrompts(prev => ({ ...prev, enableError: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  Enable error sounds
                </label>
              </div>

              {/* Preview Button */}
              <button
                onClick={() => {
                  if (soundTheme === 'voice') {
                    playVoice('success', scanPrompts);
                  } else {
                    playBeep('success');
                  }
                }}
                className="w-full px-4 py-2 bg-zinc-700 text-white rounded text-sm hover:bg-zinc-600"
              >
                Test Success Sound
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  localStorage.setItem('scanPromptSettings', JSON.stringify(scanPrompts));
                  setShowScanPromptsConfig(false);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-500"
              >
                Save
              </button>
              <button
                onClick={() => setShowScanPromptsConfig(false)}
                className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded text-sm hover:bg-zinc-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
