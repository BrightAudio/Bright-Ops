"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ImportedLead = {
  id: string;
  name: string;
  email: string;
  org: string | null;
  title: string | null;
  snippet: string | null;
  status: string;
  source: string | null;
  phone: string | null;
  venue: string | null;
  created_at: string;
};

const STATUS_COLORS = {
  uncontacted: "bg-gray-100 text-gray-800",
  contacted: "bg-blue-100 text-blue-800",
  "follow-up": "bg-yellow-100 text-yellow-800",
  interested: "bg-green-100 text-green-800",
  converted: "bg-purple-100 text-purple-800",
  archived: "bg-red-100 text-red-800",
};

export default function ArchivedLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<ImportedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    try {
      const supabaseAny = supabase as any;
      const { data, error } = await supabaseAny
        .from('leads')
        .select('*')
        .eq('status', 'archived')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error('Error loading leads:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(leadId: string) {
    try {
      const supabaseAny = supabase as any;
      await supabaseAny
        .from('leads')
        .update({ status: 'interested' })
        .eq('id', leadId);
      
      loadLeads();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  }

  async function handlePermanentDelete(leadId: string) {
    if (!confirm('Are you sure you want to permanently delete this lead?')) {
      return;
    }

    try {
      const supabaseAny = supabase as any;
      await supabaseAny
        .from('leads')
        .delete()
        .eq('id', leadId);
      
      loadLeads();
    } catch (err) {
      console.error('Error deleting lead:', err);
    }
  }

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(search.toLowerCase()) ||
    lead.email.toLowerCase().includes(search.toLowerCase()) ||
    (lead.org && lead.org.toLowerCase().includes(search.toLowerCase())) ||
    (lead.title && lead.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6" style={{ minHeight: '100vh', background: '#1a1a1a', color: '#e5e5e5' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#f3f4f6' }}>Archived Leads</h1>
          <p className="text-sm" style={{ color: '#9ca3af' }}>Leads you've archived or are no longer pursuing</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/app/dashboard/leads/imported')}
            className="px-4 py-2 rounded-lg"
            style={{
              background: '#2a2a2a',
              border: '1px solid #333333',
              color: '#e5e5e5',
              cursor: 'pointer'
            }}
            title="Back to imported leads"
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, email, organization, or title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
          style={{
            background: '#2a2a2a',
            border: '1px solid #333333',
            color: '#e5e5e5'
          }}
        />
      </div>

      {/* Leads Table */}
      {loading ? (
        <div className="text-center py-12" style={{ color: '#9ca3af' }}>
          <i className="fas fa-spinner fa-spin text-3xl mb-4"></i>
          <p>Loading leads...</p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-12 rounded-lg shadow" style={{ background: '#2a2a2a' }}>
          <i className="fas fa-inbox text-4xl mb-4" style={{ color: '#4b5563' }}></i>
          <p style={{ color: '#9ca3af' }}>
            {search ? "No leads found matching your search" : "No archived leads yet."}
          </p>
          <button
            onClick={() => router.push('/app/dashboard/leads/imported')}
            className="mt-4 px-4 py-2 rounded-lg"
            style={{
              background: '#667eea',
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Go to Imported Leads
          </button>
        </div>
      ) : (
        <div className="rounded-lg shadow" style={{ background: '#2a2a2a' }}>
          <style>{`
            .table-scroll-wrapper {
              width: 100%;
              overflow-x: auto;
              overflow-y: hidden;
              -webkit-overflow-scrolling: touch;
            }
            .table-scroll-wrapper::-webkit-scrollbar {
              height: 12px;
            }
            .table-scroll-wrapper::-webkit-scrollbar-track {
              background: #1a1a1a;
              border-radius: 6px;
            }
            .table-scroll-wrapper::-webkit-scrollbar-thumb {
              background: linear-gradient(to right, #667eea 0%, #764ba2 100%);
              border-radius: 6px;
            }
            .table-scroll-wrapper::-webkit-scrollbar-thumb:hover {
              background: linear-gradient(to right, #764ba2 0%, #667eea 100%);
            }
          `}</style>
          <div className="table-scroll-wrapper">
            <table className="w-full" style={{ minWidth: '1000px' }}>
            <thead style={{ background: '#333333', borderBottom: '1px solid #444444' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: '#9ca3af' }}>Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: '#9ca3af' }}>Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: '#9ca3af' }}>Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: '#9ca3af' }}>Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: '#9ca3af' }}>Venue / Org</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: '#9ca3af' }}>Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase" style={{ color: '#9ca3af' }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#333333' }}>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} style={{ background: '#2a2a2a' }}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: '#e5e5e5' }}>
                    {lead.title || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium" style={{ color: '#f3f4f6' }}>{lead.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#e5e5e5' }}>
                    {lead.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#e5e5e5' }}>
                    {lead.phone || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#e5e5e5' }}>
                    {lead.venue || lead.org || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        STATUS_COLORS[lead.status as keyof typeof STATUS_COLORS] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleRestore(lead.id)}
                        style={{
                          background: '#667eea',
                          color: 'white',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                        title="Restore to interested"
                      >
                        ↩️ Restore
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(lead.id)}
                        style={{
                          background: '#cc3333',
                          color: 'white',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                        title="Permanently delete this lead"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
