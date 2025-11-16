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

export default function InterestedLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<ImportedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
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
    loadCampaigns();
  }, []);

  async function loadLeads() {
    try {
      const supabaseAny = supabase as any;
      const { data, error } = await supabaseAny
        .from('leads')
        .select('*')
        .eq('status', 'interested')
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
    if (selectedLeads.size === 0) return;
    const lead = leads.find(l => selectedLeads.has(l.id));
    if (lead) {
      setSelectedLeadForAction(lead);
      setShowEmailModal(true);
    }
  }

  function handleScheduleMeeting() {
    if (selectedLeads.size === 0) return;
    const lead = leads.find(l => selectedLeads.has(l.id));
    if (lead) {
      setSelectedLeadForAction(lead);
      setShowScheduleModal(true);
    }
  }

  function handleAddToCampaign() {
    if (selectedLeads.size === 0) return;
    const lead = leads.find(l => selectedLeads.has(l.id));
    if (lead) {
      setSelectedLeadForAction(lead);
      setShowCampaignModal(true);
    }
  }

  async function handleSendEmail() {
    if (!selectedLeadForAction || !emailData.subject || !emailData.body) {
      alert('Please fill in all email fields');
      return;
    }

    try {
      const response = await fetch('/api/leads/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedLeadForAction.email,
          subject: emailData.subject,
          body: emailData.body,
          leadId: selectedLeadForAction.id
        })
      });

      if (response.ok) {
        alert('Email sent successfully!');
        setShowEmailModal(false);
        setEmailData({ subject: '', body: '' });
        setSelectedLeads(new Set());
      } else {
        alert('Failed to send email');
      }
    } catch (err) {
      console.error('Error sending email:', err);
      alert('Error sending email');
    }
  }

  async function handleScheduleComplete() {
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
      await fetch('/api/leads/schedule-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLeadForAction.id,
          date: scheduleData.date,
          time: scheduleData.time,
          type: scheduleData.type,
          notes: scheduleData.notes
        })
      });

      alert('Meeting scheduled! Lead marked as converted.');
      setShowScheduleModal(false);
      setScheduleData({ date: '', time: '', type: 'call', notes: '' });
      setSelectedLeads(new Set());
      loadLeads();
    } catch (err) {
      console.error('Error scheduling meeting:', err);
      alert('Error scheduling meeting');
    }
  }

  async function handleAddToCampaignSubmit() {
    if (!selectedLeadForAction || !selectedCampaignId) {
      alert('Please select a campaign');
      return;
    }

    try {
      const response = await fetch('/api/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: selectedCampaignId,
          leadId: selectedLeadForAction.id,
          email: selectedLeadForAction.email
        })
      });

      if (response.ok) {
        alert('Lead added to campaign!');
        setShowCampaignModal(false);
        setSelectedCampaignId('');
        setSelectedLeads(new Set());
      } else {
        alert('Failed to add lead to campaign');
      }
    } catch (err) {
      console.error('Error adding to campaign:', err);
      alert('Error adding to campaign');
    }
  }

  async function handleMarkAsConverted(leadId: string) {
    try {
      const supabaseAny = supabase as any;
      await supabaseAny
        .from('leads')
        .update({ status: 'converted' })
        .eq('id', leadId);
      
      loadLeads();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  }

  async function handleMarkAsArchived(leadId: string) {
    try {
      const supabaseAny = supabase as any;
      await supabaseAny
        .from('leads')
        .update({ status: 'archived' })
        .eq('id', leadId);
      
      loadLeads();
    } catch (err) {
      console.error('Error updating status:', err);
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
          <h1 className="text-2xl font-bold" style={{ color: '#f3f4f6' }}>Interested Leads</h1>
          <p className="text-sm" style={{ color: '#9ca3af' }}>Follow up with leads who have shown interest</p>
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
            {search ? "No leads found matching your search" : "No interested leads yet."}
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
                        onClick={() => handleMarkAsConverted(lead.id)}
                        style={{
                          background: '#764ba2',
                          color: 'white',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                        title="Mark as converted"
                      >
                        ✓ Convert
                      </button>
                      <button
                        onClick={() => handleMarkAsArchived(lead.id)}
                        style={{
                          background: '#666666',
                          color: 'white',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
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
      )}

      {/* Follow-up Email Modal */}
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

            <div className="p-6 border-t border-[#333333] flex gap-3 justify-end">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 rounded-lg"
                style={{ background: '#2a2a2a', border: '1px solid #333333', color: '#e5e5e5', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                className="px-4 py-2 rounded-lg"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {showScheduleModal && selectedLeadForAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-lg shadow-2xl max-w-2xl w-full border border-[#333333]">
            <div className="p-6 border-b border-[#333333]">
              <h2 className="text-xl font-bold text-[#e5e5e5]">Schedule Meeting</h2>
              <p className="text-[#9ca3af] text-sm mt-2">
                With: <strong>{selectedLeadForAction.name}</strong>
              </p>
            </div>

            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#e5e5e5] mb-2">Date</label>
                  <input
                    type="date"
                    value={scheduleData.date}
                    onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                    className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#333333] rounded-lg text-[#e5e5e5]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#e5e5e5] mb-2">Time</label>
                  <input
                    type="time"
                    value={scheduleData.time}
                    onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                    className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#333333] rounded-lg text-[#e5e5e5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#e5e5e5] mb-2">Meeting Type</label>
                <select
                  value={scheduleData.type}
                  onChange={(e) => setScheduleData({ ...scheduleData, type: e.target.value })}
                  className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#333333] rounded-lg text-[#e5e5e5]"
                >
                  <option value="call">Phone Call</option>
                  <option value="video">Video Call</option>
                  <option value="in-person">In-Person</option>
                  <option value="email">Email</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#e5e5e5] mb-2">Notes</label>
                <textarea
                  value={scheduleData.notes}
                  onChange={(e) => setScheduleData({ ...scheduleData, notes: e.target.value })}
                  placeholder="Add any meeting notes..."
                  rows={4}
                  className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#333333] rounded-lg text-[#e5e5e5]"
                />
              </div>
            </div>

            <div className="p-6 border-t border-[#333333] flex gap-3 justify-end">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 rounded-lg"
                style={{ background: '#2a2a2a', border: '1px solid #333333', color: '#e5e5e5', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleComplete}
                className="px-4 py-2 rounded-lg"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                Schedule & Mark as Converted
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Campaign Modal */}
      {showCampaignModal && selectedLeadForAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-lg shadow-2xl max-w-2xl w-full border border-[#333333]">
            <div className="p-6 border-b border-[#333333]">
              <h2 className="text-xl font-bold text-[#e5e5e5]">Add to Campaign</h2>
              <p className="text-[#9ca3af] text-sm mt-2">
                For: <strong>{selectedLeadForAction.name}</strong> ({selectedLeadForAction.email})
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#e5e5e5] mb-2">Select Campaign</label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#333333] rounded-lg text-[#e5e5e5]"
                >
                  <option value="">Choose a campaign...</option>
                  {campaigns.map(campaign => (
                    <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-[#333333] flex gap-3 justify-end">
              <button
                onClick={() => setShowCampaignModal(false)}
                className="px-4 py-2 rounded-lg"
                style={{ background: '#2a2a2a', border: '1px solid #333333', color: '#e5e5e5', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddToCampaignSubmit}
                className="px-4 py-2 rounded-lg"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', cursor: 'pointer' }}
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
