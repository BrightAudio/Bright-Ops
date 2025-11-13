"use client";

import { useState, useEffect, use } from "react";
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

const STATUS_OPTIONS = [
  "uncontacted",
  "contacted",
  "follow-up",
  "interested",
  "converted",
  "archived",
];

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [emailPreview, setEmailPreview] = useState({ subject: "", body: "" });
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadLead();
  }, [unwrappedParams.id]);

  async function loadLead() {
    try {
      const supabaseAny = supabase as any;
      const { data, error } = await supabaseAny
        .from("leads")
        .select("*")
        .eq("id", unwrappedParams.id)
        .single();

      if (error) throw error;

      const leadData = data as any;
      setLead(leadData);
      setNotes(leadData.notes || "");
      setStatus(leadData.status || "uncontacted");
      
      if (leadData.generated_subject && leadData.generated_body) {
        setEmailPreview({
          subject: leadData.generated_subject,
          body: leadData.generated_body,
        });
      }
    } catch (err) {
      console.error("Error loading lead:", err);
      alert("Failed to load lead");
      router.push("/app/dashboard/leads");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateEmail() {
    if (!lead) return;
    
    setGenerating(true);
    try {
      const response = await fetch("/api/leads/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadName: lead.name,
          leadTitle: lead.title,
          leadOrg: lead.org,
          snippet: lead.snippet,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate email");
      }

      const data = await response.json();
      setEmailPreview({
        subject: data.subject,
        body: data.body,
      });

      // Save generated email to database
      const supabaseAny = supabase as any;
      await supabaseAny
        .from("leads")
        .update({
          generated_subject: data.subject,
          generated_body: data.body,
        })
        .eq("id", lead.id);

      alert("Email generated successfully!");
    } catch (err) {
      console.error("Error generating email:", err);
      alert("Failed to generate email. Make sure OPENAI_API_KEY is configured.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSendEmail() {
    if (!lead || !emailPreview.subject || !emailPreview.body) {
      alert("Please generate an email first");
      return;
    }

    const confirmed = confirm(`Send email to ${lead.email}?\n\nSubject: ${emailPreview.subject}`);
    if (!confirmed) return;

    try {
      const response = await fetch("/api/leads/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          to: lead.email,
          subject: emailPreview.subject,
          body: emailPreview.body,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        
        // Update lead status
        const supabaseAny = supabase as any;
        await supabaseAny
          .from("leads")
          .update({
            status: "contacted",
            last_contacted: new Date().toISOString(),
          })
          .eq("id", lead.id);

        loadLead();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error("Error sending email:", err);
      alert("Failed to send email");
    }
  }

  async function handleUpdateLead() {
    if (!lead) return;

    setSaving(true);
    try {
      const supabaseAny = supabase as any;
      const { error } = await supabaseAny
        .from("leads")
        .update({
          status,
          notes,
          generated_subject: emailPreview.subject || null,
          generated_body: emailPreview.body || null,
        })
        .eq("id", lead.id);

      if (error) throw error;

      alert("Lead updated successfully!");
      loadLead();
    } catch (err) {
      console.error("Error updating lead:", err);
      alert("Failed to update lead");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteLead() {
    if (!lead) return;

    const confirmed = confirm(`Delete lead ${lead.name}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", lead.id);

      if (error) throw error;

      alert("Lead deleted successfully");
      router.push("/app/dashboard/leads");
    } catch (err) {
      console.error("Error deleting lead:", err);
      alert("Failed to delete lead");
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <i className="fas fa-spinner fa-spin text-3xl text-gray-400 mb-4"></i>
            <p className="text-gray-500">Loading lead...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center py-12 text-gray-500">Lead not found</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/app/dashboard/leads")}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <i className="fas fa-arrow-left"></i>
              Back to Leads
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{lead.name}</h1>
              <p className="text-sm text-gray-500">{lead.title} at {lead.org}</p>
            </div>
          </div>
          <button
            onClick={handleDeleteLead}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <i className="fas fa-trash"></i>
            Delete Lead
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Lead Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Info Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase">Email</label>
                  <p className="text-gray-900">{lead.email}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Organization</label>
                  <p className="text-gray-900">{lead.org || "—"}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Title</label>
                  <p className="text-gray-900">{lead.title || "—"}</p>
                </div>
                {lead.snippet && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Context</label>
                    <p className="text-sm text-gray-600">{lead.snippet}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status & Notes Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Status & Notes</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add notes about this lead..."
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase">Last Contacted</label>
                  <p className="text-gray-900">
                    {lead.last_contacted
                      ? new Date(lead.last_contacted).toLocaleString()
                      : "Never"}
                  </p>
                </div>

                <button
                  onClick={handleUpdateLead}
                  disabled={saving}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Email Generation */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Email Outreach</h2>
                <button
                  onClick={handleGenerateEmail}
                  disabled={generating}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <i className={`fas ${generating ? "fa-spinner fa-spin" : "fa-magic"}`}></i>
                  {generating ? "Generating..." : "Generate Email with AI"}
                </button>
              </div>

              {emailPreview.subject || emailPreview.body ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <input
                      type="text"
                      value={emailPreview.subject}
                      onChange={(e) => setEmailPreview({ ...emailPreview, subject: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Body</label>
                    <textarea
                      value={emailPreview.body}
                      onChange={(e) => setEmailPreview({ ...emailPreview, body: e.target.value })}
                      rows={12}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSendEmail}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-paper-plane"></i>
                      Send Email
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(emailPreview.body);
                        alert("Email copied to clipboard!");
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                    >
                      <i className="fas fa-copy"></i>
                      Copy
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <i className="fas fa-envelope text-4xl mb-4 text-gray-300"></i>
                  <p>Click "Generate Email with AI" to create a personalized outreach email</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
