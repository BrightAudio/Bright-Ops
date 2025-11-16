'use client';

import { useState, useEffect } from 'react';
import { FaEnvelope, FaPlus, FaPaperPlane, FaChartLine, FaEdit, FaTrash, FaPlay, FaPause } from 'react-icons/fa';
import { supabaseBrowser } from '@/lib/supabaseClient';

type Campaign = {
  id: string;
  name: string;
  subject: string;
  body_template: string;
  status: string;
  scheduled_at: string | null;
  total_recipients: number;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  failed_count: number;
  created_at: string;
};

export default function EmailCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateSection, setShowCreateSection] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body_template: '',
    target_status: 'uncontacted',
  });
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const supabase = supabaseBrowser();

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns((data as any) || []);
    } catch (err) {
      console.error('Error loading campaigns:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create campaign
      const { data: newCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          name: formData.name,
          subject: formData.subject,
          body_template: formData.body_template,
          status: 'draft',
          target_status: formData.target_status,
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Get leads matching target status
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id')
        .eq('status', formData.target_status);

      if (leadsError) throw leadsError;

      if (leads && leads.length > 0) {
        // Create campaign recipients
        const recipients = leads.map((lead: any) => ({
          campaign_id: (newCampaign as any).id,
          lead_id: lead.id,
          status: 'pending',
        }));

        const { error: recipientsError } = await supabase
          .from('campaign_recipients')
          .insert(recipients as any);

        if (recipientsError) throw recipientsError;

        // Update campaign total_recipients
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await supabase
          .from('campaigns')
          // @ts-expect-error - Database type mismatch
          .update({ total_recipients: leads.length })
          .eq('id', (newCampaign as any).id);

        if (updateError) throw updateError;
      }

      alert(`Campaign created with ${leads?.length || 0} recipients!`);
      setFormData({ name: '', subject: '', body_template: '', target_status: 'uncontacted' });
      setShowCreateSection(false);
      loadCampaigns();
    } catch (err: any) {
      console.error('Error creating campaign:', err);
      alert(`Failed to create campaign: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleSendCampaign(campaignId: string) {
    const confirmed = confirm('Start sending this campaign? This will send emails to all pending recipients.');
    if (!confirmed) return;

    setSending(campaignId);

    try {
      const response = await fetch('/api/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send campaign');
      }

      alert(data.message);
      loadCampaigns();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSending(null);
    }
  }

  async function handleDeleteCampaign(campaignId: string) {
    const confirmed = confirm('Delete this campaign? This action cannot be undone.');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      alert('Campaign deleted');
      loadCampaigns();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: '#9ca3af',
      scheduled: '#3b82f6',
      sending: '#f59e0b',
      sent: '#10b981',
      paused: '#6b7280',
    };
    return colors[status] || '#9ca3af';
  };

  return (
    <div className="p-6" style={{ 
      minHeight: '100vh',
      background: '#1a1a1a',
      color: '#e5e5e5'
    }}>
      <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#f3f4f6' }}>Email Campaigns</h1>
            <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>Manage and track your email outreach campaigns</p>
          </div>
          <button
            onClick={() => setShowCreateSection(true)}
            className="px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
          >
            <FaPlus />
            New Campaign
          </button>
        </div>

        {/* Campaigns List */}
        {loading ? (
          <div className="text-center py-12" style={{ color: '#9ca3af' }}>Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-lg shadow-sm p-12 text-center" style={{ 
            background: '#2a2a2a',
            border: '1px solid #333333'
          }}>
            <div className="inline-block p-4 rounded-full mb-4" style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
              <FaEnvelope size={48} style={{ color: '#667eea' }} />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: '#f3f4f6' }}>No Campaigns Yet</h2>
            <p className="mb-6 max-w-md mx-auto" style={{ color: '#9ca3af' }}>
              Create your first campaign to send bulk emails to your leads.
            </p>
            <button
              onClick={() => setShowCreateSection(true)}
              className="px-6 py-3 text-white rounded-lg transition-all flex items-center gap-2 mx-auto hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }}
            >
              <FaPlus />
              Create Campaign
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="rounded-lg shadow-sm p-6"
                style={{ 
                  background: '#2a2a2a',
                  border: '1px solid #333333'
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1" style={{ color: '#f3f4f6' }}>
                      {campaign.name}
                    </h3>
                    <p className="text-sm mb-2" style={{ color: '#9ca3af' }}>
                      Subject: {campaign.subject}
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          background: `${getStatusColor(campaign.status)}20`,
                          color: getStatusColor(campaign.status),
                        }}
                      >
                        {campaign.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {campaign.status === 'draft' && (
                      <button
                        onClick={() => handleSendCampaign(campaign.id)}
                        disabled={sending === campaign.id}
                        className="px-3 py-2 rounded-lg transition-all flex items-center gap-2 hover:opacity-80"
                        style={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                        }}
                      >
                        <FaPlay size={12} />
                        {sending === campaign.id ? 'Sending...' : 'Send'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      className="px-3 py-2 rounded-lg transition-colors"
                      style={{
                        background: '#ef4444',
                        color: 'white',
                      }}
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 pt-4" style={{ borderTop: '1px solid #333333' }}>
                  <div>
                    <div className="text-xs" style={{ color: '#9ca3af' }}>Recipients</div>
                    <div className="text-xl font-semibold" style={{ color: '#f3f4f6' }}>
                      {campaign.total_recipients}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: '#9ca3af' }}>Sent</div>
                    <div className="text-xl font-semibold" style={{ color: '#10b981' }}>
                      {campaign.sent_count}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: '#9ca3af' }}>Opened</div>
                    <div className="text-xl font-semibold" style={{ color: '#3b82f6' }}>
                      {campaign.opened_count}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: '#9ca3af' }}>Clicked</div>
                    <div className="text-xl font-semibold" style={{ color: '#8b5cf6' }}>
                      {campaign.clicked_count}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: '#9ca3af' }}>Failed</div>
                    <div className="text-xl font-semibold" style={{ color: '#ef4444' }}>
                      {campaign.failed_count}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Campaign Section */}
        {showCreateSection && (
          <div className="mb-8 p-6 rounded-lg" style={{ 
            background: '#2a2a2a',
            border: '1px solid #333333'
          }}>
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#f3f4f6' }}>Create Email Campaign</h2>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#e5e5e5' }}>
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 rounded-lg"
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #333333',
                    color: '#e5e5e5'
                  }}
                  placeholder="e.g., Q4 Outreach"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#e5e5e5' }}>
                  Email Subject (use {'{{name}}'}, {'{{org}}'})
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  className="w-full px-4 py-2 rounded-lg"
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #333333',
                    color: '#e5e5e5'
                  }}
                  placeholder="Hi {{name}}, Partnership Opportunity"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#e5e5e5' }}>
                  Email Body (use {'{{name}}'}, {'{{org}}'}, {'{{title}}'}, {'{{email}}'})
                </label>
                <textarea
                  value={formData.body_template}
                  onChange={(e) => setFormData({ ...formData, body_template: e.target.value })}
                  required
                  rows={10}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #333333',
                    color: '#e5e5e5'
                  }}
                  placeholder="Hi {{name}},&#10;&#10;I noticed {{org}} and wanted to reach out...&#10;&#10;Best regards"
                />
                <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                  Merge fields will be replaced with actual lead data
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#e5e5e5' }}>
                  Target Audience
                </label>
                <select
                  value={formData.target_status}
                  onChange={(e) => setFormData({ ...formData, target_status: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #333333',
                    color: '#e5e5e5'
                  }}
                >
                  <option value="uncontacted">Uncontacted Leads</option>
                  <option value="contacted">Contacted Leads</option>
                  <option value="follow-up">Follow-up Leads</option>
                  <option value="interested">Interested Leads</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4" style={{ borderTop: '1px solid #333333', marginTop: '2rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateSection(false)}
                  className="flex-1 px-4 py-2 rounded-lg"
                  style={{
                    background: '#333333',
                    color: '#e5e5e5'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 rounded-lg transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                  }}
                >
                  {saving ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
  );
}
