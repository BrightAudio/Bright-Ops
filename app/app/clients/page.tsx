'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/layout/DashboardLayout';

type Client = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  job_count?: number;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ email: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setLoading(true);
    try {
      // Get all unique client names from jobs
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('client, client_id')
        .not('client', 'is', null) as any;
      
      if (jobsError) throw jobsError;

      // Get existing clients from clients table
      const { data: existingClients, error: clientsError } = await supabase
        .from('clients')
        .select('*') as any;
      
      if (clientsError) throw clientsError;

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
            job_count: 0
          });
        }
      });

      // Count jobs and add clients that only exist in jobs table
      jobs?.forEach((job: any) => {
        if (job.client) {
          if (clientMap.has(job.client)) {
            const client = clientMap.get(job.client)!;
            client.job_count = (client.job_count || 0) + 1;
          } else {
            // Client exists in jobs but not in clients table
            clientMap.set(job.client, {
              id: '', // No ID yet - needs to be created
              name: job.client,
              email: null,
              phone: null,
              job_count: 1
            });
          }
        }
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
      alert('Failed to save client information');
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
        <div className="text-center py-8 text-zinc-400">
          {search ? 'No clients match your search' : 'No clients found. Clients will appear here when you add them to jobs.'}
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
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-amber-400">{client.name}</div>
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}