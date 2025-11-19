'use client';

import { useState, useEffect } from 'react';
import { FaKey, FaEnvelope, FaRobot, FaSave, FaCheckCircle, FaLock, FaLockOpen } from 'react-icons/fa';
import { supabaseBrowser } from '@/lib/supabaseClient';

export default function LeadSettingsPage() {
  // Password protection state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const SETTINGS_PASSWORD = 'Bright1992'; // Current settings password
  
  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  const storedPassword = localStorage.getItem('settingsPassword') || SETTINGS_PASSWORD;

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [sendgridApiKey, setSendgridApiKey] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [googleSearchEngineId, setGoogleSearchEngineId] = useState('');
  const [emailFromName, setEmailFromName] = useState('');
  const [emailFromAddress, setEmailFromAddress] = useState('');
  const [emailReplyTo, setEmailReplyTo] = useState('');
  const [aiTone, setAiTone] = useState('professional');
  const [aiTemplate, setAiTemplate] = useState('');
  const [lastRotationDate, setLastRotationDate] = useState<string | null>(null);

  const supabase = supabaseBrowser();

  // Handle password authentication
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    
    const correctPassword = localStorage.getItem('settingsPassword') || SETTINGS_PASSWORD;
    if (passwordInput === correctPassword) {
      setIsAuthenticated(true);
      setPasswordInput('');
      loadSettings();
    } else {
      setPasswordError('Incorrect password. Please try again.');
      setPasswordInput('');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError('');
    setPasswordChangeSuccess(false);

    const correctPassword = localStorage.getItem('settingsPassword') || SETTINGS_PASSWORD;
    
    if (currentPasswordInput !== correctPassword) {
      setPasswordChangeError('Current password is incorrect.');
      return;
    }

    if (newPasswordInput.length < 6) {
      setPasswordChangeError('New password must be at least 6 characters.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordChangeError('New passwords do not match.');
      return;
    }

    if (newPasswordInput === correctPassword) {
      setPasswordChangeError('New password must be different from current password.');
      return;
    }

    localStorage.setItem('settingsPassword', newPasswordInput);
    setPasswordChangeSuccess(true);
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setTimeout(() => {
      setShowChangePassword(false);
      setPasswordChangeSuccess(false);
    }, 2000);
  };

  // Load settings on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
    } else {
      setLoading(false);
    }
    // Load last rotation date from localStorage
    const savedDate = localStorage.getItem('apiKeyRotationDate');
    setLastRotationDate(savedDate);
  }, [isAuthenticated]);

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
        setOpenaiApiKey((data as any).openai_api_key || '');
        setSendgridApiKey((data as any).sendgrid_api_key || '');
        setGoogleApiKey((data as any).google_api_key || '');
        setGoogleSearchEngineId((data as any).google_search_engine_id || '');
        setEmailFromName((data as any).email_from_name || 'Bright Audio');
        setEmailFromAddress((data as any).email_from_address || '');
        setEmailReplyTo((data as any).email_reply_to || '');
        setAiTone((data as any).ai_tone || 'professional');
        setAiTemplate((data as any).ai_template || '');
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
        google_api_key: googleApiKey || null,
        google_search_engine_id: googleSearchEngineId || null,
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
        const { error } = (await supabase
          .from('leads_settings')
          // @ts-expect-error - Database type mismatch
          .update(settingsData as any)
          .eq('id', (existing as any).id)) as any;

        if (error) throw error;
      } else {
        // Insert new settings
        const { error } = (await supabase
          .from('leads_settings')
          .insert(settingsData as any)) as any;

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

  // If not authenticated, show password form
  if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="max-w-md mx-auto mt-12">
          <div className="bg-[#2a2a2a] rounded-lg border border-[#333333] p-8 shadow-lg">
            <div className="flex justify-center mb-6">
              <FaLock className="text-yellow-500" size={40} />
            </div>
            <h1 className="text-2xl font-bold text-center text-[#e5e5e5] mb-2">Settings Locked</h1>
            <p className="text-center text-[#9ca3af] mb-6">Enter the password to access lead settings.</p>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="Enter settings password"
                  className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#444444] rounded-lg text-[#e5e5e5] placeholder-[#6b7280] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  autoFocus
                />
              </div>
              
              {passwordError && (
                <div className="p-3 bg-red-900/20 border border-red-600 rounded-lg text-red-400 text-sm">
                  {passwordError}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FaLockOpen size={16} />
                Unlock Settings
              </button>
            </form>
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

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#e5e5e5]">Lead Settings</h1>
            <p className="text-sm text-[#9ca3af] mt-1">Configure your lead generation and outreach settings</p>
          </div>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="px-4 py-2 bg-[#333333] hover:bg-[#444444] text-[#e5e5e5] text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <FaLock size={14} />
            Lock Settings
          </button>
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

            <div>
              <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                Google API Key
              </label>
              <input
                type="password"
                value={googleApiKey}
                onChange={(e) => setGoogleApiKey(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#333333] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[#e5e5e5]"
                placeholder="AIza..."
              />
              <p className="text-xs text-[#9ca3af] mt-1">
                Required for Google Search. Get your key from{' '}
                <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                  Google Cloud Console
                </a>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                Google Search Engine ID
              </label>
              <input
                type="text"
                value={googleSearchEngineId}
                onChange={(e) => setGoogleSearchEngineId(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#333333] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[#e5e5e5]"
                placeholder="0123456789abcdef..."
              />
              <p className="text-xs text-[#9ca3af] mt-1">
                Create a Custom Search Engine at{' '}
                <a href="https://programmablesearchengine.google.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                  Programmable Search Engine
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* 3-Month API Key Rotation Reminder */}
        <div className="bg-amber-900/20 border border-amber-600 rounded-lg p-6 mb-6">
          <div className="flex gap-4">
            <div className="text-3xl flex-shrink-0">⚠️</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-400 mb-2">
                Rotate API Keys Every 3 Months
              </h3>
              <p className="text-sm text-amber-300/90 mb-3 leading-relaxed">
                For optimal security, rotate your API keys every three months. This helps prevent unauthorized access and protects your lead data. Compromised keys should be rotated immediately.
              </p>
              {lastRotationDate && (
                <div className="mb-3 p-2 bg-amber-600/20 border border-amber-500/30 rounded text-sm text-amber-300">
                  <span className="font-medium">Last Rotation:</span> {lastRotationDate}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    const lastRotated = prompt('When did you last rotate these keys? (YYYY-MM-DD format)', lastRotationDate || '');
                    if (lastRotated) {
                      localStorage.setItem('apiKeyRotationDate', lastRotated);
                      setLastRotationDate(lastRotated);
                      alert('✅ Rotation date saved!');
                    }
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  💾 Set Last Rotation Date
                </button>
                <a
                  href="/app/dashboard/leads/security-guide"
                  className="px-4 py-2 bg-amber-600/30 border border-amber-500 text-amber-300 hover:bg-amber-600/50 rounded-lg text-sm font-medium transition-colors"
                >
                  📚 Security Guide
                </a>
              </div>
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

        {/* Change Password Section */}
        <div className="bg-[#2a2a2a] rounded-lg shadow-sm border border-[#333333] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FaLock className="text-purple-500" size={20} />
              <h2 className="text-lg font-semibold text-[#e5e5e5]">Security</h2>
            </div>
            {!showChangePassword && (
              <button
                onClick={() => {
                  setShowChangePassword(true);
                  setPasswordChangeError('');
                  setPasswordChangeSuccess(false);
                }}
                className="px-4 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Change Password
              </button>
            )}
          </div>

          {showChangePassword && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#333333] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[#e5e5e5]"
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#333333] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[#e5e5e5]"
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#e5e5e5] mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#333333] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[#e5e5e5]"
                  placeholder="Confirm new password"
                  required
                />
              </div>

              {passwordChangeError && (
                <div className="p-3 bg-red-900/20 border border-red-600 rounded-lg text-red-400 text-sm">
                  {passwordChangeError}
                </div>
              )}

              {passwordChangeSuccess && (
                <div className="p-3 bg-green-900/20 border border-green-600 rounded-lg text-green-400 text-sm flex items-center gap-2">
                  <FaCheckCircle size={16} />
                  Password changed successfully!
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setCurrentPasswordInput('');
                    setNewPasswordInput('');
                    setConfirmPasswordInput('');
                    setPasswordChangeError('');
                  }}
                  className="px-4 py-2 bg-[#333333] hover:bg-[#444444] text-[#e5e5e5] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Update Password
                </button>
              </div>
            </form>
          )}
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
