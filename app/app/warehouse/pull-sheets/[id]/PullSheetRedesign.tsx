'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import BarcodeScanner from '@/components/BarcodeScanner';

type Item = {
  id: string;
  inventory_item_id?: string | null;
  item_name?: string;
  qty_requested?: number;
  qty_pulled?: number;
  notes?: string | null;
  inventory_items?: {
    barcode?: string;
    name?: string;
    category?: string;
  };
};

type PullSheet = {
  id: string;
  name: string;
  status: string;
  scheduled_out_at: string | null;
  expected_return_at: string | null;
  notes: string | null;
  jobs?: {
    code?: string;
    title?: string;
  };
};

type ScanHistoryItem = {
  id: string;
  item_name: string;
  scanned_at: string;
  location: string;
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

// Function to determine subcategory from item name
const getSubcategory = (itemName: string, category: string): string => {
  const name = itemName.toLowerCase();
  const subcats = SUBCATEGORIES[category] || [];
  
  // Audio speaker detection by brand/model
  if (category === 'AUDIO' || category === 'OTHER') {
    // Subs
    if (name.includes('b1-15') || name.includes('b112') || name.includes('sub') || 
        name.includes('b215') || name.includes('sb') || name.includes('bass')) {
      return 'Subs';
    }
    // Tops/Speakers
    if (name.includes('arcs') || name.includes('kara') || name.includes('ks') || 
        name.includes('qsc') || name.includes('k12') || name.includes('k10') ||
        name.includes('srx') || name.includes('vrx') || name.includes('line array')) {
      return 'Tops';
    }
    // Wedges/Monitors
    if (name.includes('wedge') || name.includes('monitor') || name.includes('12m') || 
        name.includes('115xt')) {
      return 'Wedges';
    }
    // Mixers
    if (name.includes('mixer') || name.includes('m32') || name.includes('x32') || 
        name.includes('sq') || name.includes('console')) {
      return 'Mixers';
    }
    // Microphones
    if (name.includes('mic') || name.includes('sm58') || name.includes('sm57') || 
        name.includes('beta') || name.includes('shure')) {
      return 'Microphones';
    }
    // Amplifiers
    if (name.includes('amp') || name.includes('amplifier') || name.includes('power')) {
      return 'Amplifiers';
    }
  }
  
  // Lighting detection
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
  
  // Generic subcategory matching
  for (const subcat of subcats) {
    const subcatLower = subcat.toLowerCase();
    if (name.includes(subcatLower)) {
      return subcat;
    }
  }
  
  // Default subcategory - use first one for AUDIO/LIGHTING to show items
  if (category === 'AUDIO') return 'Other Audio';
  if (category === 'LIGHTING') return 'Other Lighting';
  if (category === 'OTHER') return 'Other Audio'; // Assume OTHER items are audio for now
  
  return subcats[subcats.length - 1] || 'Other';
};

export default function PullSheetRedesign({ 
  pullSheet, 
  items, 
  onRefresh 
}: { 
  pullSheet: PullSheet;
  items: Item[];
  onRefresh: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'pullsheet' | 'scanhistory' | 'manifest'>('pullsheet');
  const [pullSheetWidth, setPullSheetWidth] = useState(50); // percentage
  const [lastScan, setLastScan] = useState<any>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [soundTheme, setSoundTheme] = useState<'ding' | 'voice'>('ding');
  const [userName, setUserName] = useState('User');

  const totalRequested = items.reduce((sum, item) => sum + (item.qty_requested || 0), 0);
  const totalPulled = items.reduce((sum, item) => sum + (item.qty_pulled || 0), 0);
  const progress = totalRequested > 0 ? Math.round((totalPulled / totalRequested) * 100) : 0;

  // Group items by category and subcategory
  const groupedItems: Record<string, Record<string, Item[]>> = {};
  
  console.log('Pull Sheet Items:', items); // Debug
  
  items.forEach(item => {
    // Get category from inventory_items or fallback to AUDIO (most common)
    let category = 'AUDIO';
    if (item.inventory_items?.category) {
      category = item.inventory_items.category.toUpperCase();
    }
    
    // Ensure category is in our CATEGORIES list
    if (!CATEGORIES.includes(category)) {
      category = 'AUDIO'; // Default to AUDIO instead of OTHER
    }
    
    const itemName = item.inventory_items?.name || item.item_name || 'Unknown Item';
    const subcategory = getSubcategory(itemName, category);
    
    console.log(`Item: ${itemName}, Category: ${category}, Subcategory: ${subcategory}`); // Debug
    
    if (!groupedItems[category]) {
      groupedItems[category] = {};
    }
    if (!groupedItems[category][subcategory]) {
      groupedItems[category][subcategory] = [];
    }
    groupedItems[category][subcategory].push(item);
  });
  
  console.log('Grouped Items:', groupedItems); // Debug

  const handleActivate = async () => {
    try {
      const { error } = await supabase
        .from('pull_sheets')
        .update({ status: 'active' } as any)
        .eq('id', pullSheet.id);
      
      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error('Failed to activate:', err);
      alert('Failed to activate pull sheet');
    }
  };

  const handleFinalize = async () => {
    const confirmed = window.confirm('Finalize this pull sheet?');
    if (!confirmed) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('pull_sheets')
        .update({ status: 'finalized' } as any)
        .eq('id', pullSheet.id);
      
      if (error) throw error;
      alert('Pull sheet finalized!');
      router.push('/app/warehouse/pull-sheets');
    } catch (err) {
      console.error('Failed to finalize:', err);
      alert('Failed to finalize pull sheet');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateQty = async (itemId: string, field: 'qty_requested' | 'qty_pulled', value: number) => {
    try {
      const { error } = await supabase
        .from('pull_sheet_items')
        .update({ [field]: value } as any)
        .eq('id', itemId);
      
      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error('Failed to update qty:', err);
    }
  };

  const handleUpdateNotes = async (itemId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('pull_sheet_items')
        .update({ notes } as any)
        .eq('id', itemId);
      
      if (error) throw error;
    } catch (err) {
      console.error('Failed to update notes:', err);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] bg-zinc-900 flex flex-col">
      {/* Pull Sheet Header */}
      <div className="bg-zinc-800 border-b border-zinc-700 flex-shrink-0">
        <div className="flex items-center justify-between px-6 py-2">
          {/* Left: Job Title with Border */}
          <div className="border-2 border-zinc-600 rounded px-4 py-2 bg-zinc-750">
            <h1 className="text-lg font-bold text-white">
              {pullSheet.jobs?.title || pullSheet.name}
              {pullSheet.jobs?.code && (
                <span className="text-sm text-zinc-400 ml-3">Job #{pullSheet.jobs.code}</span>
              )}
            </h1>
          </div>

          {/* Right: Last Scan Header */}
          <div className="flex items-center gap-4">
            <div className="h-8 w-px bg-zinc-600"></div>
            <div className="text-white font-semibold text-sm">Last Scan</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pb-2">
          <div className="flex items-center gap-4">
            <div className="flex-1 h-6 bg-zinc-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500 flex items-center justify-center"
                style={{ width: `${progress}%` }}
              >
                {progress > 10 && (
                  <span className="text-sm font-bold text-black">{progress}%</span>
                )}
              </div>
            </div>
            {progress <= 10 && (
              <span className="text-sm font-bold text-amber-400 min-w-[3rem]">{progress}%</span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
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
        {/* Left Panel: Pull Sheet/Scan History/Manifest */}
        <div 
          className="overflow-y-auto overflow-x-hidden"
          style={{ width: `${pullSheetWidth}%` }}
        >
          {/* Barcode Scanner */}
          <div className="p-3 border-b border-zinc-700 bg-zinc-800">
            <BarcodeScanner
              pullSheetId={pullSheet.id}
              onScan={(scan) => {
                setLastScan(scan);
                onRefresh();
              }}
            />
          </div>

          {view === 'pullsheet' && (
            <div className="p-3 space-y-3">
              {CATEGORIES.map(category => {
                const categorySubcats = groupedItems[category] || {};
                const subcatKeys = Object.keys(categorySubcats);
                if (subcatKeys.length === 0) return null;

                // Count total items in category
                const totalCategoryItems = subcatKeys.reduce((sum, subcat) => sum + categorySubcats[subcat].length, 0);

                return (
                  <div key={category} className="bg-zinc-800 border-2 border-zinc-700 rounded-lg overflow-hidden">
                    {/* Main Category Header */}
                    <div className="bg-gradient-to-r from-zinc-700 to-zinc-600 px-6 py-3 border-b-2 border-zinc-600">
                      <h2 className="text-xl font-bold text-white">
                        {category}
                        <span className="ml-3 text-sm font-normal text-zinc-300">
                          ({totalCategoryItems} items)
                        </span>
                      </h2>
                    </div>

                    {/* Subcategories */}
                    {subcatKeys.map(subcategory => {
                      const subcatItems = categorySubcats[subcategory] || [];
                      
                      return (
                        <div key={subcategory} className="border-b border-zinc-700 last:border-b-0">
                          {/* Subcategory Header */}
                          <div className="bg-zinc-750 px-6 py-2 border-b border-zinc-600">
                            <h3 className="text-md font-semibold text-amber-400">
                              {subcategory}
                              <span className="ml-2 text-xs font-normal text-zinc-400">
                                ({subcatItems.length})
                              </span>
                            </h3>
                          </div>

                          {/* Items Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-zinc-800">
                                <tr className="text-left border-b border-zinc-700">
                                  <th className="px-6 py-2 text-xs font-semibold text-zinc-400 uppercase">QTY</th>
                                  <th className="px-6 py-2 text-xs font-semibold text-zinc-400 uppercase">ITEM</th>
                                  <th className="px-6 py-2 text-xs font-semibold text-zinc-400 uppercase">NOTES</th>
                                  <th className="px-6 py-2 text-xs font-semibold text-zinc-400 uppercase">PREP</th>
                                  <th className="px-6 py-2 text-xs font-semibold text-zinc-400 uppercase">ACTIONS</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-700">
                                {subcatItems.map((item: Item) => {
                                  const itemName = item.inventory_items?.name || item.item_name || 'Unknown Item';
                                  const pulled = item.qty_pulled || 0;
                                  const requested = item.qty_requested || 0;
                                  const isPrepComplete = pulled >= requested;

                                  return (
                                    <tr key={item.id} className="hover:bg-zinc-800/50 transition-colors">
                                      <td className="px-6 py-3">
                                        <div className="flex items-center gap-1 text-sm font-mono">
                                          <span className={pulled >= requested ? 'text-green-400 font-bold' : 'text-white font-bold'}>{pulled}</span>
                                          <span className="text-zinc-500">/</span>
                                          <span className="text-zinc-400">{requested}</span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-3">
                                        <div className="text-white font-medium">{itemName}</div>
                                        {item.inventory_items?.barcode && (
                                          <div className="text-xs text-zinc-500 mt-1 font-mono">
                                            {item.inventory_items.barcode}
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-6 py-3">
                                        <input
                                          type="text"
                                          value={item.notes || ''}
                                          onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                                          placeholder="Add notes..."
                                          className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-white text-xs focus:border-amber-400 focus:outline-none"
                                        />
                                      </td>
                                      <td className="px-6 py-3">
                                        {isPrepComplete ? (
                                          <span className="inline-flex items-center px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/50 rounded-full text-xs font-medium">
                                            ✓ Complete
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/50 rounded-full text-xs font-medium">
                                            Pending
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-6 py-3">
                                        <button 
                                          className="text-zinc-400 hover:text-white text-xs"
                                          onClick={() => {/* Add action handler */}}
                                        >
                                          ⋯
                                        </button>
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
                  </div>
                );
              })}
            </div>
          )}

          {view === 'scanhistory' && (
            <div className="p-4">
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-8 text-center">
                <h3 className="text-lg font-semibold text-white mb-2">Scan History</h3>
                <p className="text-zinc-400 text-sm">Recently scanned items will appear here</p>
              </div>
            </div>
          )}

          {view === 'manifest' && (
            <div className="p-4">
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-8 text-center">
                <h3 className="text-lg font-semibold text-white mb-2">Manifest Preview</h3>
                <p className="text-zinc-400 text-sm">PDF preview for client and driver</p>
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
          {/* Invisible wider hit area for easier dragging */}
          <div className="absolute inset-y-0 -left-1 -right-1 w-2"></div>
          <div className="w-1 h-12 bg-zinc-500 group-hover:bg-amber-300 rounded-full"></div>
        </div>

        {/* Right Panel: Last Scan + Actions */}
        <div className="flex-1 flex flex-col">
          {/* Last Scan Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
              {lastScan ? (
                <div className="space-y-4">
                  {/* Item Image */}
                  <div className="w-full aspect-square bg-zinc-700 rounded-lg flex items-center justify-center">
                    <div className="text-center text-zinc-500">
                      <div className="text-4xl mb-2">📦</div>
                      <div className="text-sm">Picture Unavailable</div>
                    </div>
                  </div>

                  {/* Item Details */}
                  <div>
                    <div className="text-sm text-zinc-400 mb-1">Item</div>
                    <div className="text-lg font-semibold text-white">{lastScan.item_name || 'Unknown'}</div>
                  </div>

                  <div>
                    <div className="text-sm text-zinc-400 mb-1">Location</div>
                    <div className="text-lg font-semibold text-white">{pullSheet.jobs?.title || 'On Job'}</div>
                  </div>

                  <div>
                    <div className="text-sm text-zinc-400 mb-1">Scanned</div>
                    <div className="text-sm text-zinc-300">{new Date().toLocaleTimeString()}</div>
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

          {/* Action Buttons Column */}
          <div className="p-6 space-y-3 border-t border-zinc-700">
            <button
              onClick={() => router.push(`/app/jobs/${pullSheet.jobs?.code || ''}`)}
              className="w-full px-4 py-3 bg-zinc-700 text-white rounded-lg font-medium hover:bg-zinc-600 transition-colors"
            >
              View Job
            </button>
            <button
              className="w-full px-4 py-3 bg-zinc-700 text-white rounded-lg font-medium hover:bg-zinc-600 transition-colors"
            >
              Download PDF
            </button>
            <button
              className="w-full px-4 py-3 bg-zinc-700 text-white rounded-lg font-medium hover:bg-zinc-600 transition-colors"
            >
              Share
            </button>
            <button
              onClick={onRefresh}
              className="w-full px-4 py-3 bg-amber-400 text-black rounded-lg font-semibold hover:bg-amber-500 transition-colors"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Footer - Simplified */}
      <div className="bg-zinc-800 border-t border-zinc-700 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-end gap-6">
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
            <button className="px-3 py-1 bg-zinc-700 text-white rounded text-sm hover:bg-zinc-600">
              Configure
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
