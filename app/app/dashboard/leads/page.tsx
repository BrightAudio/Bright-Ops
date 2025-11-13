"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";

type Lead = {
  id: string;
  name: string;
  email: string;
  org: string | null;
  title: string | null;
  snippet: string | null;
  status: string;
  generated_subject: string | null;
  generated_body: string | null;
  last_contacted: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_COLORS = {
  uncontacted: "bg-gray-100 text-gray-800",
  contacted: "bg-blue-100 text-blue-800",
  "follow-up": "bg-yellow-100 text-yellow-800",
  interested: "bg-green-100 text-green-800",
  converted: "bg-purple-100 text-purple-800",
  archived: "bg-red-100 text-red-800",
};

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    org: "",
    title: "",
    snippet: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    try {
      const supabaseAny = supabase as any;
      let query = supabaseAny
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error("Error loading leads:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const supabaseAny = supabase as any;
      const { error } = await supabaseAny.from("leads").insert([
        {
          name: formData.name,
          email: formData.email,
          org: formData.org || null,
          title: formData.title || null,
          snippet: formData.snippet || null,
          status: "uncontacted",
        },
      ]);

      if (error) throw error;

      setFormData({ name: "", email: "", org: "", title: "", snippet: "" });
      setShowAddModal(false);
      loadLeads();
      alert("Lead added successfully!");
    } catch (err) {
      console.error("Error adding lead:", err);
      alert("Failed to add lead");
    } finally {
      setSaving(false);
    }
  }

  const filteredLeads = leads.filter((lead) => {
    const matchesFilter = filter === "all" || lead.status === filter;
    const matchesSearch =
      search === "" ||
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      lead.org?.toLowerCase().includes(search.toLowerCase()) ||
      lead.title?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const statusCounts = {
    all: leads.length,
    uncontacted: leads.filter((l) => l.status === "uncontacted").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    "follow-up": leads.filter((l) => l.status === "follow-up").length,
    interested: leads.filter((l) => l.status === "interested").length,
    converted: leads.filter((l) => l.status === "converted").length,
    archived: leads.filter((l) => l.status === "archived").length,
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.history.back()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                backgroundColor: "#fff",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              <i className="fas fa-arrow-left"></i>
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Bright Leads Portal</h1>
              <p className="text-sm text-gray-500">Automated lead generation and outreach</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <i className="fas fa-plus"></i>
              Add Lead
            </button>
            <button
              onClick={() => alert("Coming soon: Scrape leads")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <i className="fas fa-search"></i>
              Scrape Leads
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {[
            { key: "all", label: "All Leads" },
            { key: "uncontacted", label: "Uncontacted" },
            { key: "contacted", label: "Contacted" },
            { key: "follow-up", label: "Follow-up" },
            { key: "interested", label: "Interested" },
            { key: "converted", label: "Converted" },
            { key: "archived", label: "Archived" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filter === tab.key
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {tab.label} ({statusCounts[tab.key as keyof typeof statusCounts]})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search leads by name, email, organization, or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Leads Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <i className="fas fa-spinner fa-spin text-3xl mb-4"></i>
            <p>Loading leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <i className="fas fa-inbox text-4xl text-gray-300 mb-4"></i>
            <p className="text-gray-500">
              {search || filter !== "all" ? "No leads found matching your filters" : "No leads yet. Start by scraping or adding leads manually."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Contact</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{lead.name}</div>
                      {lead.snippet && (
                        <div className="text-xs text-gray-500 truncate max-w-xs">{lead.snippet}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.title || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.org || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.email}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.last_contacted
                        ? new Date(lead.last_contacted).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => router.push(`/app/dashboard/leads/${lead.id}`)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Stats */}
        {!loading && leads.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-900">{leads.length}</div>
              <div className="text-sm text-gray-500">Total Leads</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-gray-900">{statusCounts.uncontacted}</div>
              <div className="text-sm text-gray-500">Uncontacted</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">{statusCounts.interested}</div>
              <div className="text-sm text-gray-500">Interested</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">{statusCounts.converted}</div>
              <div className="text-sm text-gray-500">Converted</div>
            </div>
          </div>
        )}
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Add New Lead</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleAddLead} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                <input
                  type="text"
                  value={formData.org}
                  onChange={(e) => setFormData({ ...formData, org: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City Arts Center"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Event Coordinator"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes/Context</label>
                <textarea
                  value={formData.snippet}
                  onChange={(e) => setFormData({ ...formData, snippet: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any additional context about this lead..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Adding..." : "Add Lead"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
