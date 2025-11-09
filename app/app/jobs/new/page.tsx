'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function NewJobPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    client_id: '',
    venue: '',
    start_at: '',
    end_at: '',
    notes: '',
    income: '',
  });

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: Implement job creation
  }

  return (
    <DashboardLayout>
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-amber-400">New Job</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-amber-300 mb-1">Job Code</label>
          <input
            name="code"
            value={formData.code}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-amber-300 mb-1">Title</label>
          <input
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-amber-300 mb-1">Job Income ($)</label>
          <input
            name="income"
            type="number"
            step="0.01"
            value={formData.income}
            onChange={handleInputChange}
            placeholder="Total revenue for this job"
            className="w-full px-3 py-2 rounded border bg-zinc-800 text-white border-zinc-700"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="px-4 py-2 bg-amber-400 text-black rounded font-semibold">
            Create Job
          </button>
          <button type="button" onClick={() => router.back()} className="px-4 py-2 border border-zinc-700 rounded">
            Cancel
          </button>
        </div>
      </form>
    </div>
    </DashboardLayout>
  );
}