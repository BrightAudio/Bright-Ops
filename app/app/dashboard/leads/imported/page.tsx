"use client";

import { useState, useEffect, useRef } from "react";
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

export default function ImportedLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<ImportedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [selectedLeadForAction, setSelectedLeadForAction] = useState<ImportedLead | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');

  // Form data
  const [emailData, setEmailData] = useState({ subject: '', body: '' });
  const [scheduleData, setScheduleData] = useState({ date: '', time: '', type: 'call', notes: '' });

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    try {
      const supabaseAny = supabase as any;
      const { data, error } = await supabaseAny
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error('Error loading leads:', err);
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

  function handleSelectAll() {
    if (selectAll) {
      setSelectedLeads(new Set());
      setSelectAll(false);
    } else {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
      setSelectAll(true);
    }
  }

  function handleSelectLead(leadId: string) {
    const newSelection = new Set(selectedLeads);
    if (newSelection.has(leadId)) {
      newSelection.delete(leadId);
      setSelectAll(false);
    } else {
      newSelection.add(leadId);
    }
    setSelectedLeads(newSelection);
  }

  function handleFollowUpEmail() {
    if (selectedLeads.size === 0) {
      alert('Please select at least one lead');
      return;
    }
    if (selectedLeads.size === 1) {
      const lead = leads.find(l => selectedLeads.has(l.id));
      if (lead) {
        setSelectedLeadForAction(lead);
        setEmailData({ subject: '', body: '' });
        setShowEmailModal(true);
      }
    } else {
      alert('Bulk email feature coming soon. Select one lead at a time for now.');
    }
  }

  function handleScheduleMeeting() {
    if (selectedLeads.size === 0) {
      alert('Please select at least one lead');
      return;
    }
    if (selectedLeads.size === 1) {
      const lead = leads.find(l => selectedLeads.has(l.id));
      if (lead) {
        setSelectedLeadForAction(lead);
        setScheduleData({ date: '', time: '', type: 'call', notes: '' });
        setShowScheduleModal(true);
      }
    } else {
      alert('Select one lead at a time for scheduling meetings');
    }
  }

  function handleAddToCampaign() {
    if (selectedLeads.size === 0) {
      alert('Please select at least one lead');
      return;
    }
    loadCampaigns();
    setShowCampaignModal(true);
  }

  async function handleSendEmail() {
    if (!selectedLeadForAction || !emailData.subject || !emailData.body) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const supabaseAny = supabase as any;
      const { error } = await supabaseAny
        .from('leads')
        .update({
          last_contacted: new Date().toISOString(),
          generated_subject: emailData.subject,
          generated_body: emailData.body,
          status: 'contacted'
        })
        .eq('id', selectedLeadForAction.id);

      if (error) throw error;

      setShowEmailModal(false);
      setSelectedLeadForAction(null);
      setEmailData({ subject: '', body: '' });
      setSelectedLeads(new Set());
      setSelectAll(false);
      loadLeads();
      alert('Follow-up email recorded!');
    } catch (err: any) {
      console.error('Error:', err);
      alert(err.message || 'Failed to save follow-up');
    }
  }

  async function handleSchedule() {
    if (!selectedLeadForAction || !scheduleData.date || !scheduleData.time) {
      alert('Please fill in date and time');
      return;
    }

    try {
      const supabaseAny = supabase as any;
      
      // Update lead status to converted
      const { error: updateError } = await supabaseAny
        .from('leads')
        .update({ status: 'converted' })
        .eq('id', selectedLeadForAction.id);

      if (updateError) throw updateError;

      // Create meeting record
      const { error } = await supabaseAny
        .from('scheduled_meetings')
        .insert([
          {
            lead_id: selectedLeadForAction.id,
            lead_name: selectedLeadForAction.name,
            lead_email: selectedLeadForAction.email,
            meeting_date: scheduleData.date,
            meeting_time: scheduleData.time,
            meeting_type: scheduleData.type,
            notes: scheduleData.notes,
            status: 'scheduled'
          }
        ]);

      if (error) throw error;

      setShowScheduleModal(false);
      setSelectedLeadForAction(null);
      setScheduleData({ date: '', time: '', type: 'call', notes: '' });
      setSelectedLeads(new Set());
      setSelectAll(false);
      loadLeads();
      alert('Meeting scheduled and lead marked as converted!');
    } catch (err: any) {
      console.error('Error:', err);
      alert(err.message || 'Failed to schedule meeting');
    }
  }

  async function handleAddToSelectedCampaign() {
    if (!selectedCampaignId) {
      alert('Please select a campaign');
      return;
    }

    try {
      const supabaseAny = supabase as any;
      const campaignRecipients = Array.from(selectedLeads).map(leadId => {
        const lead = leads.find(l => l.id === leadId);
        return {
          campaign_id: selectedCampaignId,
          lead_id: leadId,
          email: lead?.email,
          status: 'pending'
        };
      });

      const { error } = await supabaseAny
        .from('campaign_recipients')
        .insert(campaignRecipients);

      if (error) throw error;

      setShowCampaignModal(false);
      setSelectedCampaignId('');
      setSelectedLeads(new Set());
      setSelectAll(false);
      alert(`${selectedLeads.size} leads added to campaign!`);
    } catch (err: any) {
      console.error('Error:', err);
      alert(err.message || 'Failed to add leads to campaign');
    }
  }

  async function handleMarkAsInterested(leadId: string) {
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;
      
      const supabaseAny = supabase as any;
      const newStatus = lead.status === 'interested' ? 'uncontacted' : 'interested';
      
      await supabaseAny
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);
      
      loadLeads();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    }
  }

  async function handleArchiveLead(leadId: string) {
    try {
      const supabaseAny = supabase as any;
      await supabaseAny
        .from('leads')
        .update({ status: 'archived' })
        .eq('id', leadId);
      
      loadLeads();
    } catch (err) {
      console.error('Error archiving lead:', err);
      alert('Failed to archive lead');
    }
  }

  const filteredLeads = leads.filter((lead) => {
    const matchesFilter = filter === "all" || lead.status === filter;
    const matchesSearch =
      search === "" ||
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      (lead.org?.toLowerCase().includes(search.toLowerCase()) || false) ||
      (lead.title?.toLowerCase().includes(search.toLowerCase()) || false);
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
    <div className="p-6" style={{ minHeight: '100vh', background: '#1a1a1a', color: '#e5e5e5' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#f3f4f6' }}>Imported Leads</h1>
          <p className="text-sm" style={{ color: '#9ca3af' }}>Manage and follow up with scraped leads</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/app/dashboard/calendar')}
            className="px-4 py-2 rounded-lg"
            style={{
              background: '#667eea',
              border: 'none',
              color: 'white',
              cursor: 'pointer'
            }}
            title="View scheduled meetings"
          >
            📅 Calendar
          </button>
          <button
            onClick={() => router.push('/app/dashboard/leads')}
            className="px-4 py-2 rounded-lg"
            style={{
              background: '#2a2a2a',
              border: '1px solid #333333',
              color: '#e5e5e5',
              cursor: 'pointer'
            }}
            title="Back to lead scraper"
          >
            ← Back to Scraper
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      {selectedLeads.size > 0 && (
        <div className="mb-6 p-4 rounded-lg flex gap-3 flex-wrap" style={{ background: '#2a2a2a', border: '1px solid #333333' }}>
          <button
            onClick={handleFollowUpEmail}
            style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}
          >
            ✉️ Follow-up Email
          </button>
          <button
            onClick={handleScheduleMeeting}
            style={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}
          >
            📅 Schedule Meeting
          </button>
          <button
            onClick={handleAddToCampaign}
            style={{
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}
          >
            📧 Add to Campaign ({selectedLeads.size})
          </button>
        </div>
      )}

      {/* Filter Tabs - Horizontal Scroll Menu */}
      <div className="mb-6">
        <style>{`
          .filter-scroll-container {
            width: 100%;
            overflow-x: auto;
            overflow-y: hidden;
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .filter-scroll-container::-webkit-scrollbar {
            display: none;
          }
          .filter-scroll {
            display: flex;
            gap: 0.5rem;
            padding: 0.5rem 0;
          }
        `}</style>
        <div className="filter-scroll-container">
          <div className="filter-scroll" ref={scrollContainerRef}>
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
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 hover:scale-105"
                style={{
                  background: filter === tab.key 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : '#2a2a2a',
                  color: 'white',
                  border: filter === tab.key ? 'none' : '1px solid #333333',
                  boxShadow: filter === tab.key ? '0 4px 15px rgba(102, 126, 234, 0.4)' : 'none'
                }}
              >
                {tab.label} ({statusCounts[tab.key as keyof typeof statusCounts]})
              </button>
            ))}
          </div>
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
            {search || filter !== "all" ? "No leads found matching your filters" : "No imported leads yet."}
          </p>
          <button
            onClick={() => router.push('/app/dashboard/leads')}
            className="mt-4 px-4 py-2 rounded-lg"
            style={{
              background: '#667eea',
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Go to Lead Scraper
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
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
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
                <tr key={lead.id} style={{ background: '#2a2a2a' }}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedLeads.has(lead.id)}
                      onChange={() => handleSelectLead(lead.id)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
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
                        onClick={() => {
                          setSelectedLeads(new Set([lead.id]));
                          setSelectAll(false);
                        }}
                        style={{
                          background: '#667eea',
                          color: 'white',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        Select
                      </button>
                      <button
                        onClick={() => handleMarkAsInterested(lead.id)}
                        style={{
                          background: lead.status === 'interested' ? '#22c55e' : '#4facfe',
                          color: 'white',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                        title={lead.status === 'interested' ? 'Remove from interested' : 'Mark as interested'}
                      >
                        {lead.status === 'interested' ? '✓ Interested' : '💚 Interested'}
                      </button>
                      <button
                        onClick={() => handleArchiveLead(lead.id)}
                        style={{
                          background: '#ef4444',
                          color: 'white',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          marginLeft: '0.5rem'
                        }}
                        title="Archive this lead"
                      >
                        📦 Archive
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

      {showEmailModal && selectedLeadForAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-lg shadow-2xl max-w-2xl w-full border border-[#333333]">
            <div className="p-6 border-b border-[#333333]">
              <h2 className="text-xl font-bold text-[#e5e5e5]">Follow-up Email</h2>
              <p className="text-[#9ca3af] text-sm mt-2">
                To: <strong>{selectedLeadForAction.name}</strong> ({selectedLeadForAction.email})
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
                  setSelectedLeadForAction(null);
                }}
                className="flex-1 px-4 py-2 bg-[#2a2a2a] text-[#e5e5e5] rounded-lg hover:bg-[#333333]"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-600 to-red-600 text-white rounded-lg hover:from-pink-700 hover:to-red-700"
              >
                Send Follow-up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {showScheduleModal && selectedLeadForAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-lg shadow-2xl max-w-md w-full border border-[#333333]">
            <div className="p-6 border-b border-[#333333]">
              <h2 className="text-xl font-bold text-[#e5e5e5]">Schedule Meeting</h2>
              <p className="text-[#9ca3af] text-sm mt-2">
                With: <strong>{selectedLeadForAction.name}</strong>
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
                  placeholder="Add any notes..."
                  rows={3}
                  className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#333333] rounded-lg text-[#e5e5e5] focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-[#333333] flex gap-3">
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setSelectedLeadForAction(null);
                }}
                className="flex-1 px-4 py-2 bg-[#2a2a2a] text-[#e5e5e5] rounded-lg hover:bg-[#333333]"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedule}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-lg shadow-2xl max-w-md w-full border border-[#333333]">
            <div className="p-6 border-b border-[#333333]">
              <h2 className="text-xl font-bold text-[#e5e5e5]">Add to Campaign</h2>
              <p className="text-[#9ca3af] text-sm mt-2">
                Adding <strong>{selectedLeads.size} lead(s)</strong> to campaign
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
                  setSelectedCampaignId('');
                }}
                className="flex-1 px-4 py-2 bg-[#2a2a2a] text-[#e5e5e5] rounded-lg hover:bg-[#333333]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToSelectedCampaign}
                disabled={campaigns.length === 0}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg disabled:opacity-50 hover:from-purple-700 hover:to-blue-700"
              >
                Add to Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
