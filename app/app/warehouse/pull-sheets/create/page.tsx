"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Plus, Search, X, Trash2, Save } from "lucide-react";

type InventoryItem = {
  id: string;
  name: string;
  barcode: string | null;
  category: string | null;
  subcategory: string | null;
  location: string | null;
};

type SelectedItem = {
  tempId: string;
  inventory_item_id: string;
  item_name: string;
  barcode: string | null;
  category: string | null;
  qty_requested: number;
};

export default function CreatePullSheetPage() {
  const router = useRouter();
  const [pullSheetName, setPullSheetName] = useState("");
  const [jobId, setJobId] = useState<string>("");
  const [jobSearchQuery, setJobSearchQuery] = useState("");
  const [jobs, setJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  
  // Item selection
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  
  // Edit mode
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<SelectedItem> | null>(null);
  
  // Form state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Potential items
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [loadingPotentialItems, setLoadingPotentialItems] = useState(false);

  // Load jobs for selection
  async function loadJobs(search: string) {
    setJobSearchQuery(search);
    
    if (!search.trim()) {
      setJobs([]);
      return;
    }
    
    setLoadingJobs(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, code, title, client')
        .or(`code.ilike.%${search}%,title.ilike.%${search}%`)
        .limit(10);
      
      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error('Error loading jobs:', err);
    } finally {
      setLoadingJobs(false);
    }
  }

  // Select a job
  function selectJob(job: any) {
    setJobId(job.id);
    setJobSearchQuery(`${job.code} - ${job.title}`);
    setPullSheetName(`${job.code} - ${job.title}`);
    setJobs([]);
    
    // Load client for potential items
    loadClientForJob(job);
  }
  
  // Load client info for potential items
  async function loadClientForJob(job: any) {
    if (!job.client) return;
    
    try {
      const { data: clientData, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('name', job.client)
        .maybeSingle();
      
      if (!error && clientData) {
        setSelectedClient(clientData);
      }
    } catch (err) {
      console.error('Error loading client:', err);
    }
  }

  // Load potential items for selected client
  async function loadPotentialItems() {
    if (!selectedClient?.id) {
      alert('No client associated with this job');
      return;
    }
    
    setLoadingPotentialItems(true);
    try {
      const { data, error } = await (supabase as any)
        .from('potential_items')
        .select('*')
        .eq('client_id', selectedClient.id);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        alert(`No potential items found for client "${selectedClient.name}". Add items in the Clients page first.`);
        return;
      }
      
      // Add potential items to selected items list
      const newItems = data.map((item: any) => ({
        tempId: `potential-${item.id}-${Date.now()}`,
        inventory_item_id: '', // No inventory link for potential items
        item_name: item.item_name,
        barcode: null,
        category: null,
        qty_requested: item.quantity || 1,
      }));
      
      setSelectedItems([...selectedItems, ...newItems]);
      alert(`Added ${newItems.length} potential item(s) from ${selectedClient.name}`);
      
    } catch (err: any) {
      console.error('Error loading potential items:', err);
      alert('Failed to load potential items: ' + err.message);
    } finally {
      setLoadingPotentialItems(false);
    }
  }

  // Search for inventory items
  async function searchInventory() {
    if (!searchQuery.trim() && !categoryFilter && !subcategoryFilter) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    setError(null);
    
    try {
      let query = supabase
        .from('inventory_items')
        .select('id, name, barcode, category, subcategory, location');
      
      // Build filters
      const filters = [];
      
      if (searchQuery.trim()) {
        filters.push(`name.ilike.%${searchQuery.trim()}%`);
        filters.push(`barcode.ilike.%${searchQuery.trim()}%`);
      }
      
      if (categoryFilter) {
        filters.push(`category.ilike.%${categoryFilter}%`);
      }
      
      if (subcategoryFilter) {
        filters.push(`subcategory.ilike.%${subcategoryFilter}%`);
      }
      
      if (filters.length > 0) {
        query = query.or(filters.join(','));
      }
      
      const { data, error: searchError } = await query
        .order('name', { ascending: true })
        .limit(20);
      
      if (searchError) throw searchError;
      setSearchResults((data as any) || []);
    } catch (err: any) {
      console.error('Error searching inventory:', err);
      setError(err.message || 'Failed to search inventory');
    } finally {
      setSearching(false);
    }
  }

  // Add item to pull sheet
  function addItem(item: InventoryItem) {
    const newItem: SelectedItem = {
      tempId: `temp-${Date.now()}-${Math.random()}`,
      inventory_item_id: item.id,
      item_name: item.name,
      barcode: item.barcode,
      category: item.category,
      qty_requested: 1,
    };
    
    setSelectedItems([...selectedItems, newItem]);
    setSearchQuery("");
    setSearchResults([]);
  }

  // Update quantity for an item
  function updateQuantity(tempId: string, qty: number) {
    setSelectedItems(items =>
      items.map(item =>
        item.tempId === tempId ? { ...item, qty_requested: Math.max(1, qty) } : item
      )
    );
  }

  // Remove item from pull sheet
  function removeItem(tempId: string) {
    setSelectedItems(items => items.filter(item => item.tempId !== tempId));
  }

  // Start editing an item
  function startEditItem(item: SelectedItem) {
    setEditingItemId(item.tempId);
    setEditingItem({ ...item });
  }

  // Save edited item
  function saveEditItem() {
    if (!editingItemId || !editingItem) return;

    setSelectedItems(items =>
      items.map(item =>
        item.tempId === editingItemId
          ? { ...item, ...editingItem }
          : item
      )
    );

    setEditingItemId(null);
    setEditingItem(null);
  }

  // Cancel editing
  function cancelEditItem() {
    setEditingItemId(null);
    setEditingItem(null);
  }

  // Create the pull sheet
  async function handleCreate() {
    if (!pullSheetName.trim()) {
      setError("Please enter a pull sheet name");
      return;
    }
    
    if (selectedItems.length === 0) {
      setError("Please add at least one item");
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      // Get job dates if job_id is provided
      let scheduledOut = null;
      let expectedReturn = null;
      
      if (jobId) {
        const { data: jobData } = await supabase
          .from('jobs')
          .select('load_out_date, expected_return_date')
          .eq('id', jobId)
          .single();
        
        if (jobData) {
          scheduledOut = (jobData as any).load_out_date;
          expectedReturn = (jobData as any).expected_return_date;
        }
      }
      
      // Create pull sheet
      const { data: pullSheet, error: sheetError } = await (supabase
        .from('pull_sheets') as any)
        .insert([{
          name: pullSheetName,
          job_id: jobId || null,
          status: 'draft',
          scheduled_out_at: scheduledOut,
          expected_return_at: expectedReturn,
          notes: null,
        }])
        .select()
        .single();
      
      if (sheetError) throw sheetError;
      
      // Add items to pull sheet
      const itemsToInsert = selectedItems.map((item, index) => ({
        pull_sheet_id: pullSheet.id,
        inventory_item_id: item.inventory_item_id || null, // Null for potential items
        item_name: item.item_name,
        qty_requested: item.qty_requested,
        qty_pulled: 0,
        qty_fulfilled: 0,
        category: item.category || 'Other',
        prep_status: 'pending',
        sort_index: index,
        notes: null,
      }));
      
      const { error: itemsError } = await (supabase
        .from('pull_sheet_items') as any)
        .insert(itemsToInsert);
      
      if (itemsError) throw itemsError;
      
      // Navigate to the new pull sheet
      router.push(`/app/warehouse/pull-sheets/${pullSheet.id}`);
      
    } catch (err: any) {
      console.error('Error creating pull sheet:', err);
      setError(err.message || 'Failed to create pull sheet');
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="bg-zinc-900 text-gray-100 p-6 min-h-screen">
        <div className="max-w-5xl mx-auto">
          {/* Edit Item Modal */}
          {editingItemId && editingItem && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-zinc-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
                <h2 className="text-lg font-bold mb-4 text-white">Edit Item</h2>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Item Name</label>
                    <input
                      type="text"
                      value={editingItem.item_name || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, item_name: e.target.value })}
                      className="w-full border border-zinc-700 rounded px-3 py-2 text-sm bg-zinc-700 text-white"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={editingItem.qty_requested || 1}
                      onChange={(e) => setEditingItem({ ...editingItem, qty_requested: parseInt(e.target.value) || 1 })}
                      className="w-full border border-zinc-700 rounded px-3 py-2 text-sm bg-zinc-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Category</label>
                    <input
                      type="text"
                      value={editingItem.category || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                      className="w-full border border-zinc-700 rounded px-3 py-2 text-sm bg-zinc-700 text-white"
                      placeholder="e.g., Audio, Lighting"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={saveEditItem}
                    className="flex-1 bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-500 font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEditItem}
                    className="flex-1 bg-zinc-700 text-white px-4 py-2 rounded hover:bg-zinc-600 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Create Pull Sheet</h1>
              <p className="text-zinc-400 text-sm mt-1">
                Search for equipment, select items, and set quantities needed
              </p>
            </div>
            <button
              onClick={() => router.push('/app/warehouse/pull-sheets')}
              className="text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-6 text-red-200">
              {error}
            </div>
          )}

          {/* Pull Sheet Details */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Pull Sheet Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Pull Sheet Name *
                </label>
                <input
                  type="text"
                  value={pullSheetName}
                  onChange={(e) => setPullSheetName(e.target.value)}
                  placeholder="e.g., Inn at St John's - Stage Rental"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-2 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
              
              <div className="relative">
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Link to Job (Optional)
                </label>
                <input
                  type="text"
                  value={jobSearchQuery}
                  onChange={(e) => loadJobs(e.target.value)}
                  placeholder="Search for job..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-4 py-2 text-white focus:border-amber-400 focus:outline-none"
                />
                {jobs.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {jobs.map(job => (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => selectJob(job)}
                        className="w-full text-left px-4 py-2 hover:bg-zinc-700 text-sm"
                      >
                        <div className="font-medium text-white">{job.code}</div>
                        <div className="text-zinc-400 text-xs">{job.title}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search & Add Items */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Equipment</h2>
              {selectedClient && (
                <button
                  onClick={loadPotentialItems}
                  disabled={loadingPotentialItems}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  title={`Load items from ${selectedClient.name}`}
                >
                  <span>📦</span>
                  <span>{loadingPotentialItems ? 'Loading...' : 'Use Potential Items'}</span>
                </button>
              )}
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchInventory()}
                  placeholder="Category (e.g., tops, subs, mixer)..."
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:border-amber-400 focus:outline-none"
                />
                <input
                  type="text"
                  value={subcategoryFilter}
                  onChange={(e) => setSubcategoryFilter(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchInventory()}
                  placeholder="Subcategory..."
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:border-amber-400 focus:outline-none"
                />
                <button
                  onClick={() => {
                    setCategoryFilter('');
                    setSubcategoryFilter('');
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600 font-medium"
                >
                  Clear Filters
                </button>
              </div>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchInventory()}
                    placeholder="Search by name or barcode (e.g., 'JBL VTX', '12345')..."
                    className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <button
                  onClick={searchInventory}
                  disabled={searching}
                  className="px-6 py-2 bg-amber-500 text-black rounded hover:bg-amber-400 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <div className="text-sm text-zinc-400 mb-2">
                  Found {searchResults.length} items - click to add
                </div>
                {searchResults.map(item => (
                  <button
                    key={item.id}
                    onClick={() => addItem(item)}
                    className="w-full text-left p-3 bg-zinc-900 border border-zinc-700 rounded hover:border-amber-500 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-white">{item.name}</div>
                        <div className="text-sm text-zinc-400 mt-1 flex gap-4">
                          {item.category && <span>Category: {item.category}</span>}
                          {item.barcode && <span className="font-mono">Barcode: {item.barcode}</span>}
                          {item.location && <span>Location: {item.location}</span>}
                        </div>
                      </div>
                      <Plus size={20} className="text-amber-400 flex-shrink-0 ml-2" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Items */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              Selected Items ({selectedItems.length})
            </h2>
            
            {selectedItems.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <Search size={48} className="mx-auto mb-4 opacity-50" />
                <p>No items added yet. Search and add equipment above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedItems.map(item => (
                  <div
                    key={item.tempId}
                    onClick={() => startEditItem(item)}
                    className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-700 rounded cursor-pointer hover:border-amber-500 hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-white">{item.item_name}</div>
                      <div className="text-sm text-zinc-400 flex gap-4 mt-1">
                        {item.category && <span>{item.category}</span>}
                        {item.barcode && <span className="font-mono">{item.barcode}</span>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-zinc-400">Qty:</label>
                      <input
                        type="number"
                        min="1"
                        value={item.qty_requested}
                        onChange={(e) => updateQuantity(item.tempId, parseInt(e.target.value) || 1)}
                        className="w-20 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-center focus:border-amber-400 focus:outline-none"
                      />
                      <span className="text-amber-400 font-medium ml-2">
                        0/{item.qty_requested} scanned
                      </span>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(item.tempId);
                      }}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                      title="Remove item"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => router.push('/app/warehouse/pull-sheets')}
              className="px-6 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || selectedItems.length === 0 || !pullSheetName.trim()}
              className="px-6 py-2 bg-amber-500 text-black rounded hover:bg-amber-400 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save size={18} />
              {saving ? 'Creating...' : 'Create Pull Sheet'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
