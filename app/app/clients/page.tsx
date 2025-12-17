'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { matchesSubcategory, getExtendedSubcategories } from '@/lib/utils/categoryMatching';

type Client = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  job_count?: number;
  upcoming_jobs?: Array<{
    id: string;
    code: string;
    title: string;
    start_at: string;
    end_at: string;
  }>;
  potential_items?: Array<{
    id: string;
    item_name: string;
    description: string | null;
    quantity: number;
    notes: string | null;
  }>;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ email: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [showPotentialItemForm, setShowPotentialItemForm] = useState<string | null>(null);
  const [newPotentialItem, setNewPotentialItem] = useState({ 
    item_name: '', 
    description: '', 
    quantity: 1, 
    notes: '',
    category: '',
    subcategory: ''
  });
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryResults, setInventoryResults] = useState<any[]>([]);
  const [searchingInventory, setSearchingInventory] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setLoading(true);
    try {
      // Get all unique client names from jobs
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('client, client_id, id, code, title, start_at, end_at')
        .not('client', 'is', null) as any;
      
      if (jobsError) throw jobsError;

      // Get existing clients from clients table
      const { data: existingClients, error: clientsError } = await supabase
        .from('clients')
        .select('*') as any;
      
      if (clientsError) throw clientsError;

      // Get potential items for all clients
      const { data: potentialItems, error: itemsError } = await (supabase as any)
        .from('potential_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (itemsError) console.error('Error loading potential items:', itemsError);

      // Merge: create a map of client names to their info
      const clientMap = new Map<string, Client>();

      // Add existing clients from clients table
      existingClients?.forEach((client: any) => {
        if (client.name) {
          clientMap.set(client.name, {
            id: client.id,
            name: client.name,
            email: client.email,
            phone: client.phone,
            job_count: 0,
            upcoming_jobs: [],
            potential_items: []
          });
        }
      });

      // Count jobs and add clients that only exist in jobs table
      const today = new Date();
      jobs?.forEach((job: any) => {
        if (job.client) {
          if (clientMap.has(job.client)) {
            const client = clientMap.get(job.client)!;
            client.job_count = (client.job_count || 0) + 1;
            
            // Add upcoming jobs (jobs that haven't ended yet)
            if (job.start_at && new Date(job.start_at) >= today) {
              client.upcoming_jobs!.push({
                id: job.id,
                code: job.code,
                title: job.title,
                start_at: job.start_at,
                end_at: job.end_at
              });
            }
          } else {
            // Client exists in jobs but not in clients table
            const upcomingJobs = job.start_at && new Date(job.start_at) >= today ? [{
              id: job.id,
              code: job.code,
              title: job.title,
              start_at: job.start_at,
              end_at: job.end_at
            }] : [];
            
            clientMap.set(job.client, {
              id: '', // No ID yet - needs to be created
              name: job.client,
              email: null,
              phone: null,
              job_count: 1,
              upcoming_jobs: upcomingJobs,
              potential_items: []
            });
          }
        }
      });

      // Add potential items to clients
      potentialItems?.forEach((item: any) => {
        const client = Array.from(clientMap.values()).find(c => c.id === item.client_id);
        if (client) {
          client.potential_items!.push({
            id: item.id,
            item_name: item.item_name,
            description: item.description,
            quantity: item.quantity,
            notes: item.notes
          });
        }
      });

      // Sort upcoming jobs by date
      clientMap.forEach(client => {
        client.upcoming_jobs?.sort((a, b) => 
          new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
        );
      });

      setClients(Array.from(clientMap.values()).sort((a, b) => 
        (a.name || '').localeCompare(b.name || '')
      ));
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(client: Client) {
    setEditingClient(client.name);
    setEditForm({ 
      email: client.email || '', 
      phone: client.phone || '' 
    });
  }

  async function handleSave(clientName: string, clientId: string) {
    setSaving(true);
    try {
      if (clientId) {
        // Update existing client
        const { error } = await (supabase as any)
          .from('clients')
          .update({
            email: editForm.email || null,
            phone: editForm.phone || null
          })
          .eq('id', clientId);
        
        if (error) throw error;
      } else {
        // Create new client record
        const { error } = await (supabase as any)
          .from('clients')
          .insert([{
            name: clientName,
            email: editForm.email || null,
            phone: editForm.phone || null
          }]);
        
        if (error) throw error;
      }
      
      setEditingClient(null);
      loadClients();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Failed to save client info');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddPotentialItem(clientId: string) {
    if (!clientId) {
      alert('Please save client info before adding potential items');
      return;
    }
    
    if (!newPotentialItem.item_name.trim()) {
      alert('Please enter an item name');
      return;
    }

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('potential_items')
        .insert([{
          client_id: clientId,
          item_name: newPotentialItem.item_name,
          description: newPotentialItem.description || null,
          quantity: newPotentialItem.quantity || 1,
          notes: newPotentialItem.notes || null,
          category: newPotentialItem.category || null,
          subcategory: newPotentialItem.subcategory || null
        }]);
      
      if (error) throw error;
      
      setNewPotentialItem({ item_name: '', description: '', quantity: 1, notes: '', category: '', subcategory: '' });
      setInventorySearch('');
      setInventoryResults([]);
      setShowPotentialItemForm(null);
      loadClients();
    } catch (error) {
      console.error('Error adding potential item:', error);
      alert('Failed to add potential item');
    } finally {
      setSaving(false);
    }
  }

  // Search inventory with extended category matching
  async function searchInventoryForPotential(query: string) {
    if (!query.trim() || query.length < 2) {
      setInventoryResults([]);
      return;
    }

    setSearchingInventory(true);
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, category, subcategory, barcode')
        .or(`name.ilike.%${query.trim()}%,category.ilike.%${query.trim()}%,subcategory.ilike.%${query.trim()}%,barcode.ilike.%${query.trim()}%`)
        .order('name', { ascending: true })
        .limit(15);

      if (error) throw error;

      setInventoryResults(data || []);
    } catch (err) {
      console.error('Error searching inventory:', err);
      setInventoryResults([]);
    } finally {
      setSearchingInventory(false);
    }
  }

  // Select an inventory item to populate the form
  function selectInventoryItem(item: any) {
    setNewPotentialItem({
      item_name: item.name,
      description: item.barcode ? `Barcode: ${item.barcode}` : '',
      quantity: 1,
      notes: '',
      category: item.category || '',
      subcategory: item.subcategory || ''
    });
    setInventorySearch('');
    setInventoryResults([]);
  }

  async function handleDeletePotentialItem(itemId: string) {
    if (!confirm('Remove this potential item?')) return;
    
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('potential_items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
      loadClients();
    } catch (error) {
      console.error('Error deleting potential item:', error);
      alert('Failed to delete potential item');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(client: Client) {
    if (!confirm(`Are you sure you want to delete ${client.name}?\n\nThis will remove the client record, but existing jobs will not be affected.`)) {
      return;
    }

    setSaving(true);
    try {
      if (client.id) {
        const { error } = await (supabase as any)
          .from('clients')
          .delete()
          .eq('id', client.id);
        
        if (error) throw error;
        loadClients();
      } else {
        alert('This client only exists in jobs and cannot be deleted here.');
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client');
    } finally {
      setSaving(false);
    }
  }

  async function handleClearAllClients() {
    if (!confirm('⚠️ WARNING: This will delete ALL clients from the database AND clear client names from all jobs.\n\nAre you sure you want to continue?')) {
      return;
    }

    if (!confirm('This action cannot be undone. Type DELETE in the next prompt to confirm.')) {
      return;
    }

    const confirmation = prompt('Type DELETE to confirm:');
    if (confirmation !== 'DELETE') {
      alert('Deletion cancelled.');
      return;
    }

    setSaving(true);
    try {
      // Delete all client records
      const { error: clientsError } = await (supabase as any)
        .from('clients')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
      
      if (clientsError) throw clientsError;

      // Clear client field from all jobs
      const { error: jobsError } = await (supabase as any)
        .from('jobs')
        .update({ client: null, client_id: null })
        .not('client', 'is', null);
      
      if (jobsError) throw jobsError;
      
      alert('All clients have been cleared from the database and jobs.');
      loadClients();
    } catch (error) {
      console.error('Error clearing clients:', error);
      alert('Failed to clear clients');
    } finally {
      setSaving(false);
    }
  }

  const filtered = clients.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded hover:bg-zinc-700 transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-amber-400">Clients</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClearAllClients}
            disabled={saving}
            className="px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
            title="Clear all test data"
          >
            Clear All
          </button>
          <Link 
            href="/app/clients/new"
            className="px-4 py-2 bg-amber-400 text-black rounded font-semibold hover:bg-amber-500 transition-colors"
          >
            New Client
          </Link>
        </div>
      </div>

      <input
        type="search"
        placeholder="Search clients..."
        className="w-full mb-4 px-4 py-2 rounded border bg-zinc-800 text-white border-zinc-700 focus:border-amber-400 focus:outline-none"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded bg-zinc-800"/>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="inline-block p-6 bg-zinc-800/50 rounded-full mb-6">
            <svg className="w-16 h-16 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-semibold text-zinc-300 mb-3">
            {search ? 'No Matching Clients' : 'No Clients Yet'}
          </h3>
          <p className="text-zinc-500 mb-8 max-w-md mx-auto">
            {search 
              ? 'Try adjusting your search terms.' 
              : 'Clients are automatically created when you add them to jobs, or you can add them directly here.'}
          </p>
          {!search && (
            <Link
              href="/app/clients/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Your First Client
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(client => (
            <div 
              key={client.name}
              className="p-4 rounded bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition-colors"
            >
              {editingClient === client.name ? (
                <div className="space-y-3">
                  <div className="font-semibold text-amber-400">{client.name}</div>
                  <div className="text-xs text-zinc-500">{client.job_count} job{client.job_count !== 1 ? 's' : ''}</div>
                  <div className="space-y-2">
                    <input
                      type="email"
                      placeholder="Email address"
                      className="w-full px-3 py-2 rounded border bg-zinc-900 text-white border-zinc-700 focus:border-amber-400 focus:outline-none"
                      value={editForm.email}
                      onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                    />
                    <input
                      type="tel"
                      placeholder="Phone number"
                      className="w-full px-3 py-2 rounded border bg-zinc-900 text-white border-zinc-700 focus:border-amber-400 focus:outline-none"
                      value={editForm.phone}
                      onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(client.name, client.id)}
                      disabled={saving}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingClient(null)}
                      disabled={saving}
                      className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-amber-400">{client.name}</div>
                        {client.upcoming_jobs && client.upcoming_jobs.length > 0 && (
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                            {client.upcoming_jobs.length} upcoming
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 mb-2">{client.job_count} job{client.job_count !== 1 ? 's' : ''}</div>
                      {client.email ? (
                        <div className="text-sm text-zinc-300">📧 {client.email}</div>
                      ) : (
                        <div className="text-sm text-zinc-500 italic">No email</div>
                      )}
                      {client.phone ? (
                        <div className="text-sm text-zinc-300">📞 {client.phone}</div>
                      ) : (
                        <div className="text-sm text-zinc-500 italic">No phone</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setExpandedClient(expandedClient === client.name ? null : client.name)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                        title="View upcoming dates and potential items"
                      >
                        {expandedClient === client.name ? '▲ Hide' : '▼ Details'}
                      </button>
                      <button
                        onClick={() => handleEdit(client)}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-black rounded text-sm font-medium transition-colors"
                      >
                        {client.id ? 'Edit' : 'Add Info'}
                      </button>
                      {client.id && (
                        <button
                          onClick={() => handleDelete(client)}
                          disabled={saving}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                          title="Delete client"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Section */}
                  {expandedClient === client.name && (
                    <div className="mt-4 pt-4 border-t border-zinc-700 space-y-4">
                      {/* Upcoming Dates */}
                      <div>
                        <div className="font-semibold text-green-400 mb-2 flex items-center gap-2">
                          📅 Upcoming Dates
                        </div>
                        {client.upcoming_jobs && client.upcoming_jobs.length > 0 ? (
                          <div className="space-y-2">
                            {client.upcoming_jobs.map(job => (
                              <div key={job.id} className="p-2 bg-zinc-900 rounded border border-zinc-700">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium text-white">{job.code} - {job.title}</div>
                                    <div className="text-sm text-zinc-400 mt-1">
                                      {new Date(job.start_at).toLocaleDateString()} 
                                      {job.end_at && ` - ${new Date(job.end_at).toLocaleDateString()}`}
                                    </div>
                                  </div>
                                  <Link 
                                    href={`/app/jobs/${job.id}`}
                                    className="text-blue-400 hover:text-blue-300 text-sm"
                                  >
                                    View →
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-zinc-500 italic">No upcoming jobs</div>
                        )}
                      </div>

                      {/* Potential Items */}
                      <div>
                        <div className="font-semibold text-purple-400 mb-2 flex items-center gap-2 justify-between">
                          <span>📦 Potential Items</span>
                          <button
                            onClick={() => setShowPotentialItemForm(showPotentialItemForm === client.id ? null : client.id)}
                            className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium transition-colors"
                            disabled={!client.id}
                            title={!client.id ? 'Save client info first' : 'Add potential item'}
                          >
                            + Add Item
                          </button>
                        </div>

                        {showPotentialItemForm === client.id && (
                          <div className="mb-3 p-3 bg-zinc-900 rounded border border-purple-600 space-y-2">
                            {/* Inventory Search */}
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="🔍 Search inventory (try 'tops', 'mixer', etc)..."
                                className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700 focus:border-purple-400 focus:outline-none text-sm"
                                value={inventorySearch}
                                onChange={e => {
                                  setInventorySearch(e.target.value);
                                  searchInventoryForPotential(e.target.value);
                                }}
                              />
                              {searchingInventory && (
                                <div className="absolute right-3 top-2.5 text-purple-400 text-xs">Searching...</div>
                              )}
                              {inventoryResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded max-h-48 overflow-y-auto">
                                  {inventoryResults.map(item => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => selectInventoryItem(item)}
                                      className="w-full text-left px-3 py-2 hover:bg-zinc-700 border-b border-zinc-700 last:border-b-0"
                                    >
                                      <div className="text-white text-sm font-medium">{item.name}</div>
                                      <div className="text-zinc-400 text-xs">
                                        {item.subcategory && <span className="mr-2">📂 {item.subcategory}</span>}
                                        {item.barcode && <span>🏷️ {item.barcode}</span>}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="text-xs text-zinc-500 italic">Or enter manually:</div>

                            <input
                              type="text"
                              placeholder="Item name *"
                              className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700 focus:border-purple-400 focus:outline-none text-sm"
                              value={newPotentialItem.item_name}
                              onChange={e => setNewPotentialItem(f => ({ ...f, item_name: e.target.value }))}
                            />
                            <input
                              type="text"
                              placeholder="Description"
                              className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700 focus:border-purple-400 focus:outline-none text-sm"
                              value={newPotentialItem.description}
                              onChange={e => setNewPotentialItem(f => ({ ...f, description: e.target.value }))}
                            />
                            <input
                              type="number"
                              placeholder="Quantity"
                              min="1"
                              className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700 focus:border-purple-400 focus:outline-none text-sm"
                              value={newPotentialItem.quantity}
                              onChange={e => setNewPotentialItem(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                            />
                            <textarea
                              placeholder="Notes"
                              rows={2}
                              className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700 focus:border-purple-400 focus:outline-none text-sm"
                              value={newPotentialItem.notes}
                              onChange={e => setNewPotentialItem(f => ({ ...f, notes: e.target.value }))}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAddPotentialItem(client.id)}
                                disabled={saving}
                                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                              >
                                {saving ? 'Adding...' : 'Add'}
                              </button>
                              <button
                                onClick={() => {
                                  setShowPotentialItemForm(null);
                                  setNewPotentialItem({ item_name: '', description: '', quantity: 1, notes: '', category: '', subcategory: '' });
                                  setInventorySearch('');
                                  setInventoryResults([]);
                                }}
                                className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm font-medium transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {client.potential_items && client.potential_items.length > 0 ? (
                          <div className="space-y-2">
                            {client.potential_items.map(item => (
                              <div key={item.id} className="p-2 bg-zinc-900 rounded border border-zinc-700">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="font-medium text-white flex items-center gap-2">
                                      {item.item_name}
                                      <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded">
                                        x{item.quantity}
                                      </span>
                                    </div>
                                    {item.description && (
                                      <div className="text-sm text-zinc-400 mt-1">{item.description}</div>
                                    )}
                                    {item.notes && (
                                      <div className="text-xs text-zinc-500 mt-1 italic">{item.notes}</div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleDeletePotentialItem(item.id)}
                                    disabled={saving}
                                    className="text-red-400 hover:text-red-300 text-sm ml-2 disabled:opacity-50"
                                    title="Remove item"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-zinc-500 italic">
                            No potential items. {client.id ? 'Add items that this client may need for jobs.' : 'Save client info first to add items.'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}