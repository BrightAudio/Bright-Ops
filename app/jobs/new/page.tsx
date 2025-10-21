'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { jobSchema, type JobFormData } from '@/lib/schemas';
// import type { Database } from '@/types/database';
import FreeScanInWidget from "../FreeScanInWidget";
import PrepSheetScanWidget from "../PrepSheetScanWidget";


export default function NewJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [formData, setFormData] = useState<JobFormData>({
    code: '',
    title: null,
    client_id: '',
    venue: null,
    start_at: null,
    end_at: null,
    notes: null,
  });

  // ...existing logic...

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value || null,
    }));
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold mb-6 text-amber-400">New Job</h1>
  <form onSubmit={handleSubmit} className="space-y-4">
        {/* ...existing form fields... */}
        {/* ...existing error and buttons... */}
        <div>
          <label className="block text-sm font-medium text-amber-300 mb-1">
            Job Code
          </label>
          <input
            name="code"
            value={formData.code || ''}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700 focus:border-amber-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-amber-300 mb-1">
            Title
          </label>
          <input
            name="title"
            value={formData.title || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700 focus:border-amber-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-amber-300 mb-1">
            Client
          </label>
          <select
            name="client_id"
            value={formData.client_id || ''}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700 focus:border-amber-400 focus:outline-none"
          >
            <option value="">Select a client...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-amber-300 mb-1">
            Venue
          </label>
          <input
            name="venue"
            value={formData.venue || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700 focus:border-amber-400 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-amber-300 mb-1">
              Start Date
            </label>
            <input
              name="start_at"
              type="datetime-local"
              value={formData.start_at || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700 focus:border-amber-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-amber-300 mb-1">
              End Date
            </label>
            <input
              name="end_at"
              type="datetime-local"
              value={formData.end_at || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700 focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-amber-300 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes || ''}
            onChange={handleInputChange}
            rows={4}
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
            {loading ? 'Saving...' : 'Create Job'}
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
      <FreeScanInWidget />
      <PrepSheetScanWidget prepSheetId="PREP-123" />
    </div>
  );
function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  // TODO: Add your job creation logic here
}

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-amber-400">New Job</h1>

  <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-amber-300 mb-1">
            Job Code
          </label>
          <input
            name="code"
            value={formData.code || ''}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-300 mb-1">
            Title
          </label>
          <input
            name="title"
            value={formData.title || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-300 mb-1">
            Client
          </label>
          <select
            name="client_id"
            value={formData.client_id || ''}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700 focus:border-amber-400 focus:outline-none"
          >
            <option value="">Select a client...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-300 mb-1">
            Venue
          </label>
          <input
            name="venue"
            value={formData.venue || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-amber-300 mb-1">
              Start Date
            </label>
            <input
              name="start_at"
              type="datetime-local"
              value={formData.start_at || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-300 mb-1">
              End Date
            </label>
            <input
              name="end_at"
              type="datetime-local"
              value={formData.end_at || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700 focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-300 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes || ''}
            onChange={handleInputChange}
            rows={4}
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
            {loading ? 'Saving...' : 'Create Job'}
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
      <FreeScanInWidget />
      <PrepSheetScanWidget prepSheetId="PREP-123" />
    </div>
  );


