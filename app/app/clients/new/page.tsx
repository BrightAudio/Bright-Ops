'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { clientSchema, type ClientFormData } from '@/lib/schemas';
import type { Database } from '@/types/database';
import { supabase } from '@/lib/supabaseClient';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    email: '',
    phone: '',
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const validatedData = clientSchema.parse(formData);
      const clientInsert: Database['public']['Tables']['clients']['Insert'] = {
        name: validatedData.name,
        email: validatedData.email || '',
        phone: validatedData.phone || '',
        // id and created_at are optional and omitted
      };
      const { error: dbError } = await supabase
        .from('clients')
        .insert([clientInsert] as any);

      if (dbError) throw dbError;
  router.push('/app/clients');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev: ClientFormData) => ({
      ...prev,
      [name]: value,
    }));
  }

  return (
    <DashboardLayout>
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded hover:bg-zinc-700 transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-amber-400">New Client</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-amber-300 mb-1">
            Name
          </label>
          <input
            name="name"
            value={formData.name || ''}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-300 mb-1">
            Email
          </label>
          <input
            name="email"
            type="email"
            value={formData.email || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-300 mb-1">
            Phone
          </label>
          <input
            name="phone"
            type="tel"
            value={formData.phone || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700 focus:border-amber-400 focus:outline-none"
          />
        </div>

        {error && (
          <div className="p-3 text-sm rounded bg-red-500/10 border border-red-500/20 text-red-500">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-amber-400 text-black rounded font-semibold disabled:opacity-50 hover:bg-amber-500 transition-colors"
          >
            {loading ? 'Saving...' : 'Create Client'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
    </DashboardLayout>
  );
}