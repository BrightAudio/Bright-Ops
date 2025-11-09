'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabaseClient';

type Invoice = {
  id: string;
  job_id: string | null;
  invoice_number: string | null;
  amount: number;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  created_at: string;
  jobs?: {
    job_name: string;
    clients?: {
      name: string;
    } | null;
  } | null;
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        jobs (
          job_name,
          clients (
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInvoices(data as any);
    }
    setLoading(false);
  }

  const filteredInvoices = filterStatus === 'all' 
    ? invoices 
    : invoices.filter(inv => inv.status === filterStatus);

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const statusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/20 text-green-400 border-green-500/40';
      case 'sent': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'overdue': return 'bg-red-500/20 text-red-400 border-red-500/40';
      default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/40';
    }
  };

  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const paidAmount = filteredInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const unpaidAmount = totalAmount - paidAmount;

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Invoices</h1>
          <p className="text-zinc-400">Manage and track all invoices</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-sm text-zinc-400 mb-1">Total Invoiced</div>
            <div className="text-2xl font-bold text-white">{formatter.format(totalAmount)}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-sm text-zinc-400 mb-1">Paid</div>
            <div className="text-2xl font-bold text-green-400">{formatter.format(paidAmount)}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-sm text-zinc-400 mb-1">Outstanding</div>
            <div className="text-2xl font-bold text-amber-400">{formatter.format(unpaidAmount)}</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {['all', 'draft', 'sent', 'paid', 'overdue'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Invoices Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-zinc-500">Loading invoices...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              <i className="fas fa-file-invoice text-4xl mb-3 opacity-50"></i>
              <p>No invoices found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-zinc-800/50 border-b border-zinc-700">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Invoice #</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Job</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Due Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredInvoices.map(invoice => {
                  const job = invoice.jobs as any;
                  return (
                    <tr key={invoice.id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-white">
                          {invoice.invoice_number || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-white">
                          {job?.job_name || 'Unknown Job'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-zinc-300">
                          {job?.clients?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-green-400">
                          {formatter.format(invoice.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {invoice.due_date 
                          ? new Date(invoice.due_date).toLocaleDateString()
                          : 'N/A'
                        }
                      </td>
                      <td className="px-4 py-3">
                        {invoice.job_id && (
                          <Link
                            href={`/app/jobs/${invoice.job_id}/estimate`}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            <i className="fas fa-eye mr-1"></i>
                            View
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
