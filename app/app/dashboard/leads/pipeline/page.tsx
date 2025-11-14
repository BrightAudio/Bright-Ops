'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { FaPlus } from 'react-icons/fa';

type Lead = {
  id: string;
  name: string;
  email: string;
  org: string | null;
  title: string | null;
  status: string;
  score: number;
  created_at: string;
};

const STATUSES = [
  { key: 'uncontacted', label: 'Uncontacted', color: '#6b7280' },
  { key: 'contacted', label: 'Contacted', color: '#3b82f6' },
  { key: 'follow-up', label: 'Follow-up', color: '#f59e0b' },
  { key: 'interested', label: 'Interested', color: '#10b981' },
  { key: 'converted', label: 'Converted', color: '#8b5cf6' },
  { key: 'archived', label: 'Archived', color: '#ef4444' },
];

export default function PipelinePage() {
  const [leadsByStatus, setLeadsByStatus] = useState<Record<string, Lead[]>>({});
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

  const supabase = supabaseBrowser();

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, org, title, status, score, created_at')
        .order('score', { ascending: false });

      if (error) throw error;

      // Group by status
      const grouped: Record<string, Lead[]> = {};
      STATUSES.forEach(status => {
        grouped[status.key] = [];
      });

      ((data as any) || []).forEach((lead: Lead) => {
        if (grouped[lead.status]) {
          grouped[lead.status].push(lead);
        }
      });

      setLeadsByStatus(grouped);
    } catch (err) {
      console.error('Error loading leads:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDrop(newStatus: string) {
    if (!draggedLead || draggedLead.status === newStatus) {
      setDraggedLead(null);
      return;
    }

    const oldStatus = draggedLead.status;

    try {
      // Optimistic update
      const updatedGrouped = { ...leadsByStatus };
      updatedGrouped[oldStatus] = updatedGrouped[oldStatus].filter(l => l.id !== draggedLead.id);
      updatedGrouped[newStatus] = [...updatedGrouped[newStatus], { ...draggedLead, status: newStatus }];
      setLeadsByStatus(updatedGrouped);

      // Update in database
      const { error: updateError } = (await supabase
        .from('leads')
        // @ts-expect-error - Database type mismatch
        .update({ status: newStatus })
        .eq('id', draggedLead.id)) as any;

      if (updateError) throw updateError;

      // Log activity
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('lead_activities').insert({
        lead_id: draggedLead.id,
        activity_type: 'status_changed',
        title: 'Status Changed',
        description: `Status changed from ${oldStatus} to ${newStatus}`,
        metadata: { old_status: oldStatus, new_status: newStatus },
        created_by: user?.id,
      } as any);

      // Recalculate score
      await fetch('/api/leads/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: draggedLead.id }),
      });
    } catch (err: any) {
      console.error('Error updating lead:', err);
      alert(`Failed to update: ${err.message}`);
      loadLeads(); // Reload on error
    } finally {
      setDraggedLead(null);
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 50) return '#f59e0b'; // Yellow
    return '#6b7280'; // Gray
  };

  if (loading) {
    return (
      <div className="p-6 text-center" style={{ color: '#9ca3af' }}>
        Loading pipeline...
      </div>
    );
  }

  return (
    <div className="p-6" style={{ minHeight: '100vh', background: '#1a1a1a' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#f3f4f6' }}>
          Lead Pipeline
        </h1>
        <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>
          Drag and drop leads to update their status
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {STATUSES.map((status) => (
          <div
            key={status.key}
            className="rounded-lg p-4"
            style={{
              background: '#2a2a2a',
              border: '1px solid #333333',
              minHeight: '500px',
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(status.key)}
          >
            {/* Column Header */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: status.color }}
                  />
                  <h3 className="font-semibold" style={{ color: '#f3f4f6' }}>
                    {status.label}
                  </h3>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: '#333333', color: '#9ca3af' }}
                >
                  {leadsByStatus[status.key]?.length || 0}
                </span>
              </div>
            </div>

            {/* Lead Cards */}
            <div className="space-y-2">
              {(leadsByStatus[status.key] || []).map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => setDraggedLead(lead)}
                  onDragEnd={() => setDraggedLead(null)}
                  className="rounded-lg p-3 cursor-move hover:opacity-80 transition-all"
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #444444',
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm" style={{ color: '#f3f4f6' }}>
                      {lead.name}
                    </h4>
                    <div
                      className="text-xs font-bold px-2 py-1 rounded"
                      style={{
                        background: `${getScoreColor(lead.score)}20`,
                        color: getScoreColor(lead.score),
                      }}
                    >
                      {lead.score || 0}
                    </div>
                  </div>
                  
                  {lead.org && (
                    <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>
                      {lead.org}
                    </p>
                  )}
                  
                  {lead.title && (
                    <p className="text-xs mb-1" style={{ color: '#6b7280' }}>
                      {lead.title}
                    </p>
                  )}
                  
                  <p className="text-xs mt-2" style={{ color: '#6b7280' }}>
                    {lead.email}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
