'use client';
// @ts-nocheck

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { finalizePrepSheetByJob } from '@/lib/hooks/usePrepSheets';

interface PrepItem {
  id: string;
  inventory_item_id: string;
  item_name: string;
  required_qty: number;
  picked_qty: number;
}

interface PrepSheet {
  id: string;
  job_id: string;
  job_code: string;
  job_title: string;
  items: PrepItem[];
}

export default function PrepSheetClient({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [prepSheet, setPrepSheet] = useState<PrepSheet | null>(null);
  const [prepSheetId, setPrepSheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Inline add row state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newRowSearch, setNewRowSearch] = useState('');
  const [newRowResults, setNewRowResults] = useState<any[]>([]);
  const [newRowSelected, setNewRowSelected] = useState<any | null>(null);
  const [newRowQty, setNewRowQty] = useState(1);

  useEffect(() => {
    fetchPrepSheet();
  }, [jobId]);

  const fetchPrepSheet = async () => {
    try {
      setLoading(true);
      
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('id, code, title')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;
      if (!jobData) throw new Error('Job not found');

      let { data: existingPrepSheet } = await supabase
        .from('prep_sheets')
        .select('*')
        .eq('job_id', jobId)
        .maybeSingle();

      if (!existingPrepSheet) {
        const { data: newPrepSheet, error: createError } = await supabase
          .from('prep_sheets')
          .insert([{ job_id: jobId, status: 'draft' }] as any)
          .select()
          .single();
        
        if (createError) throw createError;
        existingPrepSheet = newPrepSheet;
      }

      setPrepSheetId(existingPrepSheet.id);

      const { data: itemsData, error: itemsError } = await supabase
        .from('prep_sheet_items')
        .select('*, inventory_items(name)')
        .eq('prep_sheet_id', existingPrepSheet.id);

      if (itemsError) throw itemsError;

      const prepItems: PrepItem[] = (itemsData || []).map((item: any) => ({
        id: item.id,
        inventory_item_id: item.inventory_item_id,
        item_name: item.inventory_items?.name || 'Unknown Item',
        required_qty: item.required_qty || 0,
        picked_qty: item.picked_qty || 0,
      }));

      setPrepSheet({
        id: existingPrepSheet.id,
        job_id: jobId,
        job_code: (jobData as any).code || '',
        job_title: (jobData as any).title || '',
        items: prepItems,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prep sheet');
    } finally {
      setLoading(false);
    }
  };

  // Search for inline add
  useEffect(() => {
    const searchInventory = async () => {
      if (!newRowSearch.trim()) {
        setNewRowResults([]);
        return;
      }

      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, barcode, category')
        .or(`name.ilike.%${newRowSearch}%,barcode.ilike.%${newRowSearch}%,category.ilike.%${newRowSearch}%`)
        .limit(15);

      if (!error && data) {
        setNewRowResults(data);
      }
    };

    const timer = setTimeout(searchInventory, 300);
    return () => clearTimeout(timer);
  }, [newRowSearch]);

  const handleStartNewRow = () => {
    setIsAddingNew(true);
    setNewRowSearch('');
    setNewRowSelected(null);
    setNewRowQty(1);
    setNewRowResults([]);
  };

  const handleCancelNewRow = () => {
    setIsAddingNew(false);
    setNewRowSearch('');
    setNewRowSelected(null);
    setNewRowQty(1);
    setNewRowResults([]);
  };

  const handleSaveNewRow = async () => {
    if (!newRowSelected || !prepSheetId || newRowQty < 1) return;

    try {
      const { error } = await supabase
        .from('prep_sheet_items')
        .insert([{
          prep_sheet_id: prepSheetId,
          inventory_item_id: newRowSelected.id,
          required_qty: newRowQty,
          picked_qty: 0,
        }] as any);

      if (error) throw error;

      await fetchPrepSheet();
      handleCancelNewRow();
    } catch (err) {
      console.error('Error adding item:', err);
      alert('Failed to add item');
    }
  };

  const handleFinalize = async () => {
    if (!jobId) return;

    const confirmed = window.confirm('Finalize this prep sheet to a Pull Sheet? This will create a new pull sheet for warehouse picking.');
    if (!confirmed) return;

    try {
      const createdPull = await finalizePrepSheetByJob(jobId);
      router.push(`/app/warehouse/pull-sheets/${createdPull.id}`);
    } catch (err) {
      console.error('Failed to finalize prep sheet:', err);
      alert('Failed to finalize to pull sheet');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-zinc-400">Loading create pull sheet...</div>
      </DashboardLayout>
    );
  }

  if (!prepSheet) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="text-red-400 mb-4">{error || 'Prep sheet not found'}</div>
          <button onClick={() => router.back()} className="px-4 py-2 bg-zinc-800 text-white rounded hover:bg-zinc-700">Go Back</button>
        </div>
      </DashboardLayout>
    );
  }

  const totalDeficit = prepSheet.items.reduce((sum, item) => sum + item.required_qty, 0);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-amber-400 hover:text-amber-300 mb-4 inline-flex items-center gap-2">← Back to Job</button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Create Pull Sheet</h1>
              <p className="text-zinc-400 text-lg">{prepSheet.job_title} {prepSheet.job_code}</p>
              <p className="text-zinc-500 text-sm mt-2">Add equipment deficits. Items show as 0/qty until finalized.</p>
            </div>
            <button onClick={handleFinalize} disabled={prepSheet.items.length === 0} className="px-6 py-3 bg-amber-400 text-black rounded-lg font-semibold hover:bg-amber-500 transition-colors disabled:opacity-50">Finalize to Pull Sheet</button>
          </div>
        </div>

        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-2 gap-6">
            <div><div className="text-sm text-zinc-400 mb-1">Total Items</div><div className="text-2xl font-bold text-white">{prepSheet.items.length}</div></div>
            <div><div className="text-sm text-zinc-400 mb-1">Total Deficit Quantity</div><div className="text-2xl font-bold text-amber-400">{totalDeficit}</div></div>
          </div>
        </div>

        <div className="space-y-3">
          {/* Existing Items */}
          {prepSheet.items.map((item) => (
            <div key={item.id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-5 flex items-center justify-between hover:border-zinc-600 transition-colors">
              <div className="flex-1">
                <div className="text-white font-semibold text-lg mb-1">{item.item_name}</div>
                <div className="text-zinc-500 text-sm">Deficit to be filled from warehouse</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-amber-400">0/{item.required_qty}</div>
                <div className="text-zinc-500 text-xs mt-1">Not yet pulled</div>
              </div>
            </div>
          ))}

          {/* New Item Row */}
          {isAddingNew && (
            <div className="bg-zinc-800/50 border-2 border-amber-400 rounded-lg p-5">
              <div className="grid grid-cols-12 gap-4 items-start">
                <div className="col-span-7 relative">
                  <label className="block text-sm text-zinc-400 mb-2">Search Equipment</label>
                  <input
                    type="text"
                    value={newRowSearch}
                    onChange={(e) => setNewRowSearch(e.target.value)}
                    placeholder="Type name, barcode, or category..."
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:border-amber-400 focus:outline-none"
                    autoFocus
                  />
                  {newRowResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded max-h-48 overflow-y-auto z-10">
                      {newRowResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => {
                            setNewRowSelected(result);
                            setNewRowSearch('');
                            setNewRowResults([]);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-zinc-800 transition-colors border-b border-zinc-700 last:border-b-0"
                        >
                          <div className="text-white font-medium">{result.name}</div>
                          <div className="text-zinc-500 text-sm">{result.category}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {newRowSelected && (
                    <div className="mt-2 text-sm text-amber-400">Selected: {newRowSelected.name}</div>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block text-sm text-zinc-400 mb-2">Qty Needed</label>
                  <input
                    type="number"
                    min={1}
                    value={newRowQty}
                    onChange={(e) => setNewRowQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="col-span-3 flex gap-2 items-end">
                  <button
                    onClick={handleSaveNewRow}
                    disabled={!newRowSelected}
                    className="flex-1 px-4 py-2 bg-amber-400 text-black rounded font-semibold hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelNewRow}
                    className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Button */}
          {!isAddingNew && (
            <button
              onClick={handleStartNewRow}
              className="w-full px-6 py-4 bg-zinc-800 border border-zinc-700 text-white rounded-lg hover:bg-zinc-700 transition-colors inline-flex items-center justify-center gap-2"
            >
              <span className="text-xl">+</span>
              Add Equipment Deficit
            </button>
          )}

          {/* Empty State */}
          {prepSheet.items.length === 0 && !isAddingNew && (
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-12 text-center">
              <div className="text-zinc-400 text-lg mb-4">No equipment deficits added yet</div>
              <p className="text-zinc-500 text-sm">Click Add Equipment Deficit to start</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
