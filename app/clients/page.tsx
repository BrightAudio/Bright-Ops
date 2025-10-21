'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { type Database } from '@/types/database';

type Client = Database['public']['Tables']['clients']['Row'];

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadClients() {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      
      if (!error && data) {
        setClients(data);
      }
      setLoading(false);
    }
    loadClients();
  }, []);

  const filtered = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-amber-400">Clients</h1>
        <Link 
          href="/clients/new"
          className="px-4 py-2 bg-amber-400 text-black rounded font-semibold hover:bg-amber-500 transition-colors"
        >
          New Client
        </Link>
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
          No clients found
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(client => (
            <div 
              key={client.id}
              className="p-4 rounded bg-zinc-900 border border-zinc-800 hover:border-amber-400/30 transition-colors"
            >
              <div className="font-semibold text-amber-300">{client.name}</div>
              {client.email && (
                <div className="text-sm text-zinc-400">
                  {client.email}
                </div>
              )}
              {client.phone && (
                <div className="text-sm text-zinc-400">
                  {client.phone}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}