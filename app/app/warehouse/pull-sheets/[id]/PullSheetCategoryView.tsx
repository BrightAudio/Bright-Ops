'use client';
// @ts-nocheck

import { useState } from 'react';
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

const CATEGORIES = [
  'AUDIO',
  'LIGHTING',
  'VIDEO',
  'STAGE',
  'PIPE AND DRAPE',
  'EDISON',
  'MISC',
  'OTHER'
];

export default function PullSheetCategoryView({ 
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

  const handleActivate = async () => {
    try {
      const { error } = await supabase
        .from('pull_sheets')
        .update({ status: 'active' } as any)
        .eq('id', pullSheet.id);
      
      if (error) throw error;
      onRefresh();
      alert('Pull sheet activated! You can now scan items.');
    } catch (err) {
      console.error('Failed to activate:', err);
      alert('Failed to activate pull sheet');
    }
  };

  const handleFinalize = async () => {
    const confirmed = window.confirm('Finalize this pull sheet? This will mark it as complete.');
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

  // Group items by category
  const groupedItems: Record<string, Item[]> = {};
  items.forEach(item => {
    const category = item.inventory_items?.category?.toUpperCase() || 'OTHER';
    if (!groupedItems[category]) {
      groupedItems[category] = [];
    }
    groupedItems[category].push(item);
  });

  const totalRequested = items.reduce((sum, item) => sum + (item.qty_requested || 0), 0);
  const totalPulled = items.reduce((sum, item) => sum + (item.qty_pulled || 0), 0);
  const progress = totalRequested > 0 ? Math.round((totalPulled / totalRequested) * 100) : 0;

  return (
    <div className="min-h-screen bg-zinc-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button 
            onClick={() => router.back()} 
            className="text-amber-400 hover:text-amber-300 mb-4 inline-flex items-center gap-2"
          >
            ← Back to Pull Sheets
          </button>
          
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{pullSheet.name}</h1>
              {pullSheet.jobs && (
                <p className="text-zinc-400 text-lg">
                  {pullSheet.jobs.code} - {pullSheet.jobs.title}
                </p>
              )}
            </div>
            
            <div className="flex gap-3">
              {pullSheet.status === 'draft' && (
                <button 
                  onClick={handleActivate}
                  className="px-6 py-3 bg-amber-400 text-black rounded-lg font-semibold hover:bg-amber-500"
                >
                  Activate for Scanning
                </button>
              )}
              {pullSheet.status === 'active' && (
                <button 
                  onClick={handleFinalize}
                  disabled={saving}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
                >
                  {saving ? 'Finalizing...' : 'Finalize Pull Sheet'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Banner */}
        {pullSheet.status === 'draft' && (
          <div className="mb-6 bg-amber-900/30 border-2 border-amber-400 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-amber-400 mb-1">⚠ Draft Mode</h3>
            <p className="text-sm text-amber-200">
              Activate this pull sheet to enable barcode scanning and item picking.
            </p>
          </div>
        )}

        {pullSheet.status === 'active' && (
          <div className="mb-6 bg-green-900/30 border-2 border-green-400 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-400 mb-1">✓ Active - Ready for Picking</h3>
            <p className="text-sm text-green-200">
              Scan items below to update quantities. Progress: {totalPulled}/{totalRequested} ({progress}%)
            </p>
          </div>
        )}

        {/* Barcode Scanner */}
        <div className="mb-6">
          <BarcodeScanner
            pullSheetId={pullSheet.id}
            onScan={() => onRefresh()}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
            <div className="text-sm text-zinc-400 mb-1">Total Items</div>
            <div className="text-2xl font-bold text-white">{items.length}</div>
          </div>
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
            <div className="text-sm text-zinc-400 mb-1">Total Requested</div>
            <div className="text-2xl font-bold text-white">{totalRequested}</div>
          </div>
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
            <div className="text-sm text-zinc-400 mb-1">Total Pulled</div>
            <div className="text-2xl font-bold text-amber-400">{totalPulled}</div>
          </div>
        </div>

        {/* Category Sections */}
        <div className="space-y-6">
          {CATEGORIES.map(category => {
            const categoryItems = groupedItems[category] || [];
            
            return (
              <div key={category} className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden">
                {/* Category Header */}
                <div className="bg-zinc-700 px-6 py-3 border-b border-zinc-600">
                  <h2 className="text-xl font-bold text-white">
                    {category}
                    <span className="ml-2 text-sm font-normal text-zinc-400">
                      ({categoryItems.length} items)
                    </span>
                  </h2>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-zinc-750">
                      <tr className="text-left">
                        <th className="px-6 py-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">QTY</th>
                        <th className="px-6 py-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">ITEM</th>
                        <th className="px-6 py-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">NOTES</th>
                        <th className="px-6 py-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">PREP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-700">
                      {categoryItems.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                            No {category.toLowerCase()} items
                          </td>
                        </tr>
                      ) : (
                        categoryItems.map(item => {
                          const itemName = item.inventory_items?.name || item.item_name || 'Unknown Item';
                          const pulled = item.qty_pulled || 0;
                          const requested = item.qty_requested || 0;
                          const isPrepComplete = pulled >= requested;

                          return (
                            <tr key={item.id} className="hover:bg-zinc-750 transition-colors">
                              {/* QTY */}
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={0}
                                    value={pulled}
                                    onChange={(e) => handleUpdateQty(item.id, 'qty_pulled', parseInt(e.target.value) || 0)}
                                    className="w-16 px-2 py-1 bg-zinc-900 border border-zinc-600 rounded text-white text-center focus:border-amber-400 focus:outline-none"
                                  />
                                  <span className="text-zinc-500">/</span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={requested}
                                    onChange={(e) => handleUpdateQty(item.id, 'qty_requested', parseInt(e.target.value) || 0)}
                                    className="w-16 px-2 py-1 bg-zinc-900 border border-zinc-600 rounded text-white text-center focus:border-amber-400 focus:outline-none"
                                  />
                                </div>
                              </td>

                              {/* ITEM */}
                              <td className="px-6 py-4">
                                <div className="text-white font-medium">{itemName}</div>
                                {item.inventory_items?.barcode && (
                                  <div className="text-sm text-zinc-500 mt-1">
                                    Barcode: {item.inventory_items.barcode}
                                  </div>
                                )}
                              </td>

                              {/* NOTES */}
                              <td className="px-6 py-4">
                                <input
                                  type="text"
                                  value={item.notes || ''}
                                  onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                                  placeholder="Add notes..."
                                  className="w-full px-3 py-1 bg-zinc-900 border border-zinc-600 rounded text-white text-sm focus:border-amber-400 focus:outline-none"
                                />
                              </td>

                              {/* PREP */}
                              <td className="px-6 py-4">
                                {isPrepComplete ? (
                                  <span className="inline-flex items-center px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/50 rounded-full text-sm font-medium">
                                    ✓ Complete
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/50 rounded-full text-sm font-medium">
                                    Pending
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {items.length === 0 && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-12 text-center">
            <div className="text-zinc-400 text-lg mb-2">No items in this pull sheet</div>
            <p className="text-zinc-500 text-sm">Items will appear here after finalizing from prep sheet</p>
          </div>
        )}
      </div>
    </div>
  );
}
