"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import LeadScraperSection from "@/components/LeadScraperSection";
import { logQuestEvent } from "@/lib/utils/questEvents";

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
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [selectedLeadForCampaign, setSelectedLeadForCampaign] = useState<Lead | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedLeadForEmail, setSelectedLeadForEmail] = useState<Lead | null>(null);
  const [selectedLeadForSchedule, setSelectedLeadForSchedule] = useState<Lead | null>(null);
  const [emailData, setEmailData] = useState({
    subject: '',
    body: '',
  });
  const [scheduleData, setScheduleData] = useState({
    date: '',
    time: '',
    type: 'call',
    notes: '',
  });
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    try {
      const supabaseAny = supabase as any;
      const query = supabaseAny
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

  async function loadCampaigns() {
    try {
      const supabaseAny = supabase as any;
      const { data, error } = await supabaseAny
        .from('email_campaigns')
        .select('id, name')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCampaigns(data || []);
    } catch (err) {
      console.error('Error loading campaigns:', err);
    }
  }

  function handleAddToNowCampaign(lead: Lead) {
    setSelectedLeadForCampaign(lead);
    loadCampaigns();
    setShowCampaignModal(true);
  }

  function handleFollowUp(lead: Lead) {
    setSelectedLeadForEmail(lead);
    setEmailData({ subject: '', body: '' });
    setShowEmailModal(true);
  }

  function handleSchedule(lead: Lead) {
    setSelectedLeadForSchedule(lead);
    setScheduleData({ date: '', time: '', type: 'call', notes: '' });
    setShowScheduleModal(true);
  }

  async function handleConfirmAddToCampaign() {
    if (!selectedCampaignId || !selectedLeadForCampaign) {
      alert('Please select a campaign');
      return;
    }

    try {
      const supabaseAny = supabase as any;
      const { error } = await supabaseAny
        .from('campaign_recipients')
        .insert([
          {
            campaign_id: selectedCampaignId,
            lead_id: selectedLeadForCampaign.id,
            email: selectedLeadForCampaign.email,
            status: 'pending'
          }
        ]);

      if (error) throw error;

      setShowCampaignModal(false);
      setSelectedLeadForCampaign(null);
      setSelectedCampaignId('');
      alert('Lead added to campaign successfully!');
    } catch (err: any) {
      console.error('Error adding lead to campaign:', err);
      alert(err.message || 'Failed to add lead to campaign');
    }
  }

  async function handleSendFollowUpEmail() {
    if (!selectedLeadForEmail || !emailData.subject || !emailData.body) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const supabaseAny = supabase as any;
      
      const oldStatus = selectedLeadForEmail.status;
      
      // Save follow-up email record
      const { error } = await supabaseAny
        .from('leads')
        .update({
          last_contacted: new Date().toISOString(),
          generated_subject: emailData.subject,
          generated_body: emailData.body,
          status: 'contacted'
        })
        .eq('id', selectedLeadForEmail.id);

      if (error) throw error;

      // Log quest event for reachout
      await logQuestEvent('lead_reachout_sent', 'lead', selectedLeadForEmail.id, {
        metricValue: 1, // Count-based: one reachout action
        source: 'leads',
        metadata: {
          subject: emailData.subject,
          body_length: emailData.body.length,
          old_status: oldStatus,
          new_status: 'contacted',
        },
      });

      // Log status change event if it changed
      if (oldStatus !== 'contacted') {
        await logQuestEvent('lead_status_updated', 'lead', selectedLeadForEmail.id, {
          metricValue: 1, // Count-based: one status update
          source: 'leads',
          metadata: {
            old_status: oldStatus,
            new_status: 'contacted',
          },
        });
      }

      setShowEmailModal(false);
      setSelectedLeadForEmail(null);
      setEmailData({ subject: '', body: '' });
      loadLeads();
      alert('Follow-up email recorded!');
    } catch (err: any) {
      console.error('Error saving follow-up:', err);
      alert(err.message || 'Failed to save follow-up');
    }
  }

  async function handleScheduleMeeting() {
    if (!selectedLeadForSchedule || !scheduleData.date || !scheduleData.time) {
      alert('Please fill in date and time');
      return;
    }

    try {
      const supabaseAny = supabase as any;
      // Save meeting to database
      const { data: meetingData, error } = await supabaseAny
        .from('scheduled_meetings')
        .insert([
          {
            lead_id: selectedLeadForSchedule.id,
            lead_name: selectedLeadForSchedule.name,
            lead_email: selectedLeadForSchedule.email,
            meeting_date: scheduleData.date,
            meeting_time: scheduleData.time,
            meeting_type: scheduleData.type,
            notes: scheduleData.notes,
            status: 'scheduled'
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Log quest event for meeting booked
      await logQuestEvent('lead_meeting_booked', 'meeting', meetingData?.id || selectedLeadForSchedule.id, {
        metricValue: 1, // Count-based: one meeting booked
        source: 'leads',
        metadata: {
          lead_id: selectedLeadForSchedule.id,
          lead_name: selectedLeadForSchedule.name,
          meeting_date: scheduleData.date,
          meeting_time: scheduleData.time,
          meeting_type: scheduleData.type,
        },
      });

      setShowScheduleModal(false);
      setSelectedLeadForSchedule(null);
      setScheduleData({ date: '', time: '', type: 'call', notes: '' });
      alert('Meeting scheduled successfully!');
    } catch (err: any) {
      console.error('Error scheduling meeting:', err);
      alert(err.message || 'Failed to schedule meeting');
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

  const toggleLeadSelection = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
    setSelectAll(false);
    setShowBulkActions(newSelected.size > 0);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedLeads(new Set());
      setSelectAll(false);
      setShowBulkActions(false);
    } else {
      const allLeadIds = new Set(filteredLeads.map(lead => lead.id));
      setSelectedLeads(allLeadIds);
      setSelectAll(true);
      setShowBulkActions(true);
    }
  };

  const handleBulkImport = async () => {
    const selectedLeadsList = filteredLeads.filter(lead => selectedLeads.has(lead.id));
    if (selectedLeadsList.length === 0) return;

    try {
      const response = await fetch('/api/leads/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: selectedLeadsList }),
      });

      if (response.ok) {
        alert(`Successfully imported ${selectedLeadsList.length} lead(s)`);
        setSelectedLeads(new Set());
        setSelectAll(false);
        setShowBulkActions(false);
      }
    } catch (err) {
      console.error('Error importing leads:', err);
      alert('Failed to import leads');
    }
  };

  const statusCounts = {
    all: leads.length,
    uncontacted: leads.filter((l) => l.status === "uncontacted").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    "follow-up": leads.filter((l) => l.status === "follow-up").length,
    interested: leads.filter((l) => l.status === "interested").length,
    converted: leads.filter((l) => l.status === "converted").length,
    archived: leads.filter((l) => l.status === "archived").length,
  };

  // Chart data
  const chartData = [
    { name: 'Uncontacted', value: statusCounts.uncontacted, color: '#6b7280' },
    { name: 'Contacted', value: statusCounts.contacted, color: '#3b82f6' },
    { name: 'Follow-up', value: statusCounts['follow-up'], color: '#f59e0b' },
    { name: 'Interested', value: statusCounts.interested, color: '#10b981' },
    { name: 'Converted', value: statusCounts.converted, color: '#8b5cf6' },
    { name: 'Archived', value: statusCounts.archived, color: '#ef4444' },
  ].filter(item => item.value > 0);

  return (
    <div className="p-6" style={{ 
      minHeight: '100vh',
      background: '#1a1a1a',
      color: '#e5e5e5'
    }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#f3f4f6' }}>Bright Leads Portal</h1>
          <p className="text-sm" style={{ color: '#9ca3af' }}>Automated lead generation and outreach</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/app/dashboard/leads/imported')}
            className="px-4 py-2 border rounded-lg transition-colors flex items-center gap-2"
            style={{
              background: '#667eea',
              borderColor: '#667eea',
              color: 'white'
            }}
            title="View all imported leads for follow-up"
          >
            <i className="fas fa-inbox"></i>
            Imported Leads
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 border rounded-lg transition-colors flex items-center gap-2"
            style={{
              background: '#2a2a2a',
              borderColor: '#333333',
              color: '#e5e5e5'
            }}
          >
            <i className="fas fa-plus"></i>
            Add Lead
          </button>
        </div>
      </div>

      {/* Auto Lead Search Section */}
      <LeadScraperSection onImportComplete={loadLeads} />

      {/* Analytics Chart */}
      {!loading && leads.length > 0 && (
        <div className="mb-6 p-6 rounded-lg" style={{ background: '#2a2a2a' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#f3f4f6' }}>Lead Status Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div>
              <h3 className="text-sm font-medium mb-3" style={{ color: '#9ca3af' }}>Status Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#1a1a1a', 
                      border: '1px solid #333333',
                      borderRadius: '8px',
                      color: '#f3f4f6'
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div>
              <h3 className="text-sm font-medium mb-3" style={{ color: '#9ca3af' }}>Conversion Funnel</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: '#1a1a1a', 
                      border: '1px solid #333333',
                      borderRadius: '8px',
                      color: '#f3f4f6'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

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
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              style={{
                background: filter === tab.key 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : '#2a2a2a',
                color: 'white',
                border: filter === tab.key ? 'none' : '1px solid #333333'
              }}
            >
              {tab.label} ({statusCounts[tab.key as keyof typeof statusCounts]})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4 flex gap-4 items-end">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search leads by name, email, organization, or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
              style={{
                background: '#2a2a2a',
                border: '1px solid #333333',
                color: '#e5e5e5'
              }}
            />
          </div>
          
          {showBulkActions && (
            <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2">
              <button
                onClick={handleBulkImport}
                className="px-4 py-2 rounded-lg font-medium text-sm"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer'
                }}
                title={`Import ${selectedLeads.size} selected lead(s) to imported leads page`}
              >
                📥 Import {selectedLeads.size}
              </button>
              <button
                onClick={() => {
                  setSelectedLeads(new Set());
                  setSelectAll(false);
                  setShowBulkActions(false);
                }}
                className="px-4 py-2 rounded-lg font-medium text-sm"
                style={{
                  background: '#2a2a2a',
                  color: '#e5e5e5',
                  border: '1px solid #333333',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            </div>
          )}
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
              {search || filter !== "all" ? "No leads found matching your filters" : "No leads yet. Start by scraping or adding leads manually."}
            </p>
          </div>
        ) : (
          <div className="rounded-lg shadow overflow-hidden" style={{ background: '#2a2a2a' }}>
            <table className="w-full">
              <thead style={{ background: '#333333', borderBottom: '1px solid #444444' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: '#9ca3af' }}>
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={toggleSelectAll}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer',
                        accentColor: '#9333ea',
                      }}
                      title="Select all leads"
                    />
                  </th>
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
                  <tr key={lead.id} className="hover:bg-gray-50" style={{ background: selectedLeads.has(lead.id) ? '#3a3a3a' : '#2a2a2a' }}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: '#e5e5e5' }}>
                      <input
                        type="checkbox"
                        checked={selectedLeads.has(lead.id)}
                        onChange={() => toggleLeadSelection(lead.id)}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: '#9333ea',
                        }}
                      />
                    </td>
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
                      {(lead as any)?.phone || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#e5e5e5' }}>
                      {(lead as any)?.venue || lead.org || "—"}
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
                          onClick={() => router.push(`/app/dashboard/leads/${lead.id}`)}
                          className="font-medium"
                          style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                          title="View details"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleFollowUp(lead)}
                          className="font-medium"
                          style={{
                            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                          title="Send follow-up email"
                        >
                          ✉️
                        </button>
                        <button
                          onClick={() => handleSchedule(lead)}
                          className="font-medium"
                          style={{
                            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                          title="Schedule meeting"
                        >
                          📅
                        </button>
                        <button
                          onClick={() => handleAddToNowCampaign(lead)}
                          className="font-medium"
                          style={{
                            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                          title="Add to campaign"
                        >
                          📧
                        </button>
                      </div>
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
            <div className="p-4 rounded-lg shadow" style={{ background: '#2a2a2a' }}>
              <div className="text-2xl font-bold" style={{ color: '#f3f4f6' }}>{leads.length}</div>
              <div className="text-sm" style={{ color: '#9ca3af' }}>Total Leads</div>
            </div>
            <div className="p-4 rounded-lg shadow" style={{ background: '#2a2a2a' }}>
              <div className="text-2xl font-bold" style={{ color: '#f3f4f6' }}>{statusCounts.uncontacted}</div>
              <div className="text-sm" style={{ color: '#9ca3af' }}>Uncontacted</div>
            </div>
            <div className="p-4 rounded-lg shadow" style={{ background: '#2a2a2a' }}>
              <div className="text-2xl font-bold" style={{ color: '#10b981' }}>{statusCounts.interested}</div>
              <div className="text-sm" style={{ color: '#9ca3af' }}>Interested</div>
            </div>
            <div className="p-4 rounded-lg shadow" style={{ background: '#2a2a2a' }}>
              <div className="text-2xl font-bold" style={{ color: '#8b5cf6' }}>{statusCounts.converted}</div>
              <div className="text-sm" style={{ color: '#9ca3af' }}>Converted</div>
            </div>
          </div>
        )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="rounded-lg shadow-xl w-full max-w-md p-6" style={{ background: '#2a2a2a' }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#f3f4f6' }}>Add New Lead</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="hover:text-gray-600"
                style={{ color: '#9ca3af' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleAddLead} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#e5e5e5' }}>Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #333333',
                    color: '#e5e5e5'
                  }}
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#e5e5e5' }}>Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #333333',
                    color: '#e5e5e5'
                  }}
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#e5e5e5' }}>Organization</label>
                <input
                  type="text"
                  value={formData.org}
                  onChange={(e) => setFormData({ ...formData, org: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #333333',
                    color: '#e5e5e5'
                  }}
                  placeholder="City Arts Center"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#e5e5e5' }}>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #333333',
                    color: '#e5e5e5'
                  }}
                  placeholder="Event Coordinator"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#e5e5e5' }}>Notes/Context</label>
                <textarea
                  value={formData.snippet}
                  onChange={(e) => setFormData({ ...formData, snippet: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #333333',
                    color: '#e5e5e5'
                  }}
                  placeholder="Any additional context about this lead..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  }}
                >
                  {saving ? "Adding..." : "Add Lead"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg"
                  style={{
                    background: '#333333',
                    color: '#e5e5e5',
                    border: '1px solid #444444'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add to Campaign Modal */}
      {showCampaignModal && selectedLeadForCampaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-lg shadow-2xl max-w-md w-full border border-[#333333]">
            <div className="p-6 border-b border-[#333333]">
              <h2 className="text-xl font-bold text-[#e5e5e5]">Add to Campaign</h2>
              <p className="text-[#9ca3af] text-sm mt-2">
                Adding <strong>{selectedLeadForCampaign.name}</strong> to campaign
              </p>
            </div>

            <div className="p-6">
              {campaigns.length === 0 ? (
                <p className="text-[#9ca3af]">No campaigns available. <a href="/app/dashboard/leads/campaigns" className="text-purple-400 hover:underline">Create one first</a>.</p>
              ) : (
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#333333] rounded-lg text-[#e5e5e5] focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select a campaign...</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="p-6 border-t border-[#333333] flex gap-3">
              <button
                onClick={() => {
                  setShowCampaignModal(false);
                  setSelectedLeadForCampaign(null);
                  setSelectedCampaignId('');
                }}
                className="flex-1 px-4 py-2 bg-[#2a2a2a] text-[#e5e5e5] rounded-lg hover:bg-[#333333]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddToCampaign}
                disabled={campaigns.length === 0}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg disabled:opacity-50 hover:from-purple-700 hover:to-blue-700"
              >
                Add to Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up Email Modal */}
      {showEmailModal && selectedLeadForEmail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-lg shadow-2xl max-w-2xl w-full border border-[#333333]">
            <div className="p-6 border-b border-[#333333]">
              <h2 className="text-xl font-bold text-[#e5e5e5]">Follow-up Email</h2>
              <p className="text-[#9ca3af] text-sm mt-2">
                To: <strong>{selectedLeadForEmail.name}</strong> ({selectedLeadForEmail.email})
              </p>
            </div>

            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-[#e5e5e5] mb-2">Subject</label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  placeholder="Email subject..."
                  className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#333333] rounded-lg text-[#e5e5e5] focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#e5e5e5] mb-2">Message</label>
                <textarea
                  value={emailData.body}
                  onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                  placeholder="Write your follow-up message..."
                  rows={8}
                  className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#333333] rounded-lg text-[#e5e5e5] focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-[#333333] flex gap-3">
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setSelectedLeadForEmail(null);
                }}
                className="flex-1 px-4 py-2 bg-[#2a2a2a] text-[#e5e5e5] rounded-lg hover:bg-[#333333]"
              >
                Cancel
              </button>
              <button
                onClick={handleSendFollowUpEmail}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-600 to-red-600 text-white rounded-lg hover:from-pink-700 hover:to-red-700"
              >
                Send Follow-up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {showScheduleModal && selectedLeadForSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-lg shadow-2xl max-w-md w-full border border-[#333333]">
            <div className="p-6 border-b border-[#333333]">
              <h2 className="text-xl font-bold text-[#e5e5e5]">Schedule Meeting</h2>
              <p className="text-[#9ca3af] text-sm mt-2">
                With: <strong>{selectedLeadForSchedule.name}</strong>
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#e5e5e5] mb-2">Date</label>
                <input
                  type="date"
                  value={scheduleData.date}
                  onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                  className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#333333] rounded-lg text-[#e5e5e5] focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#e5e5e5] mb-2">Time</label>
                <input
                  type="time"
                  value={scheduleData.time}
                  onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                  className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#333333] rounded-lg text-[#e5e5e5] focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#e5e5e5] mb-2">Meeting Type</label>
                <select
                  value={scheduleData.type}
                  onChange={(e) => setScheduleData({ ...scheduleData, type: e.target.value })}
                  className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#333333] rounded-lg text-[#e5e5e5] focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="call">Phone Call</option>
                  <option value="video">Video Call</option>
                  <option value="meeting">In-Person Meeting</option>
                  <option value="email">Email Follow-up</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#e5e5e5] mb-2">Notes</label>
                <textarea
                  value={scheduleData.notes}
                  onChange={(e) => setScheduleData({ ...scheduleData, notes: e.target.value })}
                  placeholder="Add any notes about this meeting..."
                  rows={3}
                  className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#333333] rounded-lg text-[#e5e5e5] focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-[#333333] flex gap-3">
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setSelectedLeadForSchedule(null);
                }}
                className="flex-1 px-4 py-2 bg-[#2a2a2a] text-[#e5e5e5] rounded-lg hover:bg-[#333333]"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleMeeting}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
