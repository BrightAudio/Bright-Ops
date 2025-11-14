'use client';

import { useState, useEffect } from 'react';
import { FaKey, FaEnvelope, FaRobot, FaSave, FaCheckCircle } from 'react-icons/fa';
import { supabaseBrowser } from '@/lib/supabaseClient';

export default function LeadSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [sendgridApiKey, setSendgridApiKey] = useState('');
  const [emailFromName, setEmailFromName] = useState('');
  const [emailFromAddress, setEmailFromAddress] = useState('');
  const [emailReplyTo, setEmailReplyTo] = useState('');
  const [aiTone, setAiTone] = useState('professional');
  const [aiTemplate, setAiTemplate] = useState('');

  const supabase = supabaseBrowser();

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows, which is ok for first time
        throw error;
      }

      if (data) {
        setOpenaiApiKey(data.openai_api_key || '');
        setSendgridApiKey(data.sendgrid_api_key || '');
        setEmailFromName(data.email_from_name || 'Bright Audio');
        setEmailFromAddress(data.email_from_address || '');
        setEmailReplyTo(data.email_reply_to || '');
        setAiTone(data.ai_tone || 'professional');
        setAiTemplate(data.ai_template || '');
      }
    } catch (err: any) {
      console.error('Error loading settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      // Check if settings exist
      const { data: existing } = await supabase
        .from('leads_settings')
        .select('id')
        .single();

      const settingsData = {
        openai_api_key: openaiApiKey || null,
        sendgrid_api_key: sendgridApiKey || null,
        email_from_name: emailFromName || 'Bright Audio',
        email_from_address: emailFromAddress || null,
        email_reply_to: emailReplyTo || null,
        ai_tone: aiTone || 'professional',
        ai_template: aiTemplate || null,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      };

      if (existing) {
        // Update existing settings
        const { error } = await supabase
          .from('leads_settings')
          .update(settingsData)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new settings
        const { error } = await supabase
          .from('leads_settings')
          .insert(settingsData);

        if (error) throw error;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000); // Show for 5 seconds
      
      // Also show browser alert as confirmation
      alert('✅ Settings saved successfully!');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message);
      alert(`❌ Error saving settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="animate-pulse">
          <div className="h-8 bg-[#2a2a2a] rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-[#2a2a2a] rounded w-1/2 mb-6"></div>
          <div className="space-y-6">
            <div className="h-48 bg-[#2a2a2a] rounded"></div>
            <div className="h-48 bg-[#2a2a2a] rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-600 rounded-lg flex items-center gap-3 text-green-400">
            <FaCheckCircle size={20} />
            <span>Settings saved successfully!</span>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-600 rounded-lg text-red-400">
            Error: {error}
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#e5e5e5]">Lead Settings</h1>
          <p className="text-sm text-[#9ca3af] mt-1">Configure your lead generation and outreach settings</p>
        </div>

        {/* API Keys Section */}
        <div className="bg-[#2a2a2a] rounded-lg shadow-sm border border-[#333333] p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FaKey className="text-purple-500" size={20} />
            <h2 className="text-lg font-semibold text-[#e5e5e5]">API Keys</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#333333] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[#e5e5e5]"
                placeholder="sk-..."
              />
              <p className="text-xs text-[#9ca3af] mt-1">
                Used for AI-powered email generation. Get your key from{' '}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                  OpenAI Dashboard
                </a>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                SendGrid API Key
              </label>
              <input
                type="password"
                value={sendgridApiKey}
                onChange={(e) => setSendgridApiKey(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#333333] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[#e5e5e5]"
                placeholder="SG...."
              />
              <p className="text-xs text-[#9ca3af] mt-1">
                Required for sending emails. Get your key from{' '}
                <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                  SendGrid Dashboard
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Email Settings */}
        <div className="bg-[#2a2a2a] rounded-lg shadow-sm border border-[#333333] p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FaEnvelope className="text-purple-500" size={20} />
            <h2 className="text-lg font-semibold text-[#e5e5e5]">Email Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                From Name
              </label>
              <input
                type="text"
                value={emailFromName}
                onChange={(e) => setEmailFromName(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#333333] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[#e5e5e5]"
                placeholder="Your Name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                From Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={emailFromAddress}
                onChange={(e) => setEmailFromAddress(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#333333] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[#e5e5e5]"
                placeholder="you@example.com"
              />
              <p className="text-xs text-[#9ca3af] mt-1">
                Must be verified in your SendGrid account
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                Reply-To Email
              </label>
              <input
                type="email"
                value={emailReplyTo}
                onChange={(e) => setEmailReplyTo(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#333333] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[#e5e5e5]"
                placeholder="replies@example.com"
              />
            </div>
          </div>
        </div>

        {/* AI Settings */}
        <div className="bg-[#2a2a2a] rounded-lg shadow-sm border border-[#333333] p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FaRobot className="text-purple-500" size={20} />
            <h2 className="text-lg font-semibold text-[#e5e5e5]">AI Email Generation</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                Email Tone
              </label>
              <select 
                value={aiTone}
                onChange={(e) => setAiTone(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#333333] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[#e5e5e5]"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                Default Email Template
              </label>
              <textarea
                value={aiTemplate}
                onChange={(e) => setAiTemplate(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#333333] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[#e5e5e5]"
                rows={6}
                placeholder="Enter your default email template with placeholders like {{name}}, {{organization}}, etc."
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg"
          >
            <FaSave />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
  );
}
