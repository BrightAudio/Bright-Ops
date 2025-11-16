"use client";

import { FaShieldAlt, FaKey, FaClock, FaEnvelope, FaEye, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

export default function SecurityGuidePage() {
  return (
    <div className="min-h-screen bg-[#1a1a1a] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FaShieldAlt className="text-purple-500" size={32} />
            <h1 className="text-3xl font-bold text-[#e5e5e5]">Security Guide</h1>
          </div>
          <p className="text-[#9ca3af]">
            Comprehensive guide to securing your API keys, settings, and lead data
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#2a2a2a] border border-[#333333] rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <FaClock className="text-amber-500" size={20} />
              <h3 className="font-semibold text-[#e5e5e5]">API Rotation</h3>
            </div>
            <p className="text-sm text-[#9ca3af]">Every 3 months</p>
          </div>

          <div className="bg-[#2a2a2a] border border-[#333333] rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <FaKey className="text-purple-500" size={20} />
              <h3 className="font-semibold text-[#e5e5e5]">API Keys</h3>
            </div>
            <p className="text-sm text-[#9ca3af]">4 keys to protect</p>
          </div>

          <div className="bg-[#2a2a2a] border border-[#333333] rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <FaShieldAlt className="text-green-500" size={20} />
              <h3 className="font-semibold text-[#e5e5e5]">Access</h3>
            </div>
            <p className="text-sm text-[#9ca3af]">Password protected</p>
          </div>
        </div>

        {/* Critical Alert */}
        <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-8 flex gap-3">
          <FaExclamationTriangle className="text-red-500 flex-shrink-0 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-red-400 mb-1">Critical Security Rules</h3>
            <ul className="text-sm text-red-300 space-y-1">
              <li>• NEVER share your API keys with anyone</li>
              <li>• NEVER commit API keys to version control (Git)</li>
              <li>• NEVER post API keys in public forums or chat</li>
              <li>• Immediately revoke any exposed API keys</li>
            </ul>
          </div>
        </div>

        {/* API Keys Security */}
        <div className="bg-[#2a2a2a] border border-[#333333] rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FaKey className="text-purple-500" size={24} />
            <h2 className="text-xl font-semibold text-[#e5e5e5]">API Keys Security</h2>
          </div>
          <div className="space-y-3">
            <p className="text-[#9ca3af] text-sm">
              API keys are sensitive credentials that grant access to your services. Treat them like passwords and keep them confidential.
            </p>
            <p className="text-[#9ca3af] text-sm">
              Never share your API keys in emails, messages, or public repositories. If a key is exposed, revoke it immediately from the provider dashboard.
            </p>
            <p className="text-[#9ca3af] text-sm">
              Store API keys in a secure location. This application stores them encrypted in your database (Supabase). Never commit keys to version control.
            </p>
            <div className="mt-4 bg-[#1a1a1a] rounded p-4 border border-[#333333]">
              <h4 className="font-semibold text-[#e5e5e5] text-sm mb-2">Tips:</h4>
              <ul className="space-y-1 text-sm text-[#9ca3af]">
                <li>✅ Enable API key restrictions on specific IP addresses or domains</li>
                <li>✅ Use separate keys for development and production</li>
                <li>✅ Keep keys in a password manager like 1Password</li>
              </ul>
            </div>
          </div>
        </div>

        {/* API Key Rotation */}
        <div className="bg-[#2a2a2a] border border-[#333333] rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FaClock className="text-amber-500" size={24} />
            <h2 className="text-xl font-semibold text-[#e5e5e5]">API Key Rotation (Every 3 Months)</h2>
          </div>
          <div className="space-y-3">
            <p className="text-[#9ca3af] text-sm">
              Rotating API keys regularly is a critical security practice that limits exposure if a key is compromised.
            </p>
            <p className="text-[#9ca3af] text-sm">
              Set a calendar reminder every 3 months to rotate your API keys. This is a best practice recommended by all major API providers.
            </p>
            <p className="text-[#9ca3af] text-sm">
              To rotate a key: Generate a new key in the provider dashboard, update it here, test that everything works, then delete the old key.
            </p>
            <div className="mt-4 bg-[#1a1a1a] rounded p-4 border border-[#333333]">
              <h4 className="font-semibold text-[#e5e5e5] text-sm mb-2">Tips:</h4>
              <ul className="space-y-1 text-sm text-[#9ca3af]">
                <li>✅ Set quarterly calendar reminders (Jan, Apr, Jul, Oct)</li>
                <li>✅ Create new keys before deleting old ones</li>
                <li>✅ Document the rotation date in "Set Last Rotation Date"</li>
              </ul>
            </div>
          </div>
        </div>

        {/* SendGrid Security */}
        <div className="bg-[#2a2a2a] border border-[#333333] rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FaEnvelope className="text-blue-500" size={24} />
            <h2 className="text-xl font-semibold text-[#e5e5e5]">SendGrid Email Security</h2>
          </div>
          <div className="space-y-3">
            <p className="text-[#9ca3af] text-sm">
              SendGrid API keys allow sending emails on your behalf. A compromised key could be used to send spam or phishing emails.
            </p>
            <p className="text-[#9ca3af] text-sm">
              Verify your sender email domain in SendGrid to establish trust. Enable authentication records (SPF, DKIM, CNAME) for your sender domain.
            </p>
            <p className="text-[#9ca3af] text-sm">
              Monitor SendGrid dashboard for unusual email sending activity. Check statistics regularly for any red flags.
            </p>
            <div className="mt-4 bg-[#1a1a1a] rounded p-4 border border-[#333333]">
              <h4 className="font-semibold text-[#e5e5e5] text-sm mb-2">Tips:</h4>
              <ul className="space-y-1 text-sm text-[#9ca3af]">
                <li>✅ Verify your domain and enable DKIM/SPF</li>
                <li>✅ Use a dedicated email (e.g., leads@company.com)</li>
                <li>✅ Review SendGrid logs weekly</li>
              </ul>
            </div>
          </div>
        </div>

        {/* OpenAI Security */}
        <div className="bg-[#2a2a2a] border border-[#333333] rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FaShieldAlt className="text-green-500" size={24} />
            <h2 className="text-xl font-semibold text-[#e5e5e5]">OpenAI API Security</h2>
          </div>
          <div className="space-y-3">
            <p className="text-[#9ca3af] text-sm">
              OpenAI API keys authenticate requests to their AI models. Compromised keys can lead to unauthorized API usage and billing charges.
            </p>
            <p className="text-[#9ca3af] text-sm">
              OpenAI API calls are logged on your dashboard. Monitor your usage to detect unauthorized access and set spending limits.
            </p>
            <p className="text-[#9ca3af] text-sm">
              The API key in this application is used only for email generation based on lead data. Each API call costs money.
            </p>
            <div className="mt-4 bg-[#1a1a1a] rounded p-4 border border-[#333333]">
              <h4 className="font-semibold text-[#e5e5e5] text-sm mb-2">Tips:</h4>
              <ul className="space-y-1 text-sm text-[#9ca3af]">
                <li>✅ Set monthly spending limits in OpenAI billing</li>
                <li>✅ Monitor usage daily in OpenAI dashboard</li>
                <li>✅ Use GPT-3.5-turbo for cost-effectiveness</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Google Security */}
        <div className="bg-[#2a2a2a] border border-[#333333] rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FaEye className="text-red-500" size={24} />
            <h2 className="text-xl font-semibold text-[#e5e5e5]">Google Search API Security</h2>
          </div>
          <div className="space-y-3">
            <p className="text-[#9ca3af] text-sm">
              Google Search API keys allow automated search queries. Compromised keys can lead to quota exhaustion and billing issues.
            </p>
            <p className="text-[#9ca3af] text-sm">
              Restrict your API key to specific referrers (your domain) in Google Cloud Console. This prevents unauthorized use by others.
            </p>
            <p className="text-[#9ca3af] text-sm">
              Google provides free credits (100 searches/day). Paid searches cost $5 per 1000 queries. Monitor usage to avoid excessive charges.
            </p>
            <div className="mt-4 bg-[#1a1a1a] rounded p-4 border border-[#333333]">
              <h4 className="font-semibold text-[#e5e5e5] text-sm mb-2">Tips:</h4>
              <ul className="space-y-1 text-sm text-[#9ca3af]">
                <li>✅ Restrict keys to your domain only</li>
                <li>✅ Set a monthly quota limit</li>
                <li>✅ Monitor Google Cloud billing daily</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Settings Password */}
        <div className="bg-[#2a2a2a] border border-[#333333] rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FaKey className="text-purple-500" size={24} />
            <h2 className="text-xl font-semibold text-[#e5e5e5]">Settings Password Protection</h2>
          </div>
          <div className="space-y-3">
            <p className="text-[#9ca3af] text-sm">
              The settings page is protected by a password to prevent unauthorized access to sensitive API keys.
            </p>
            <p className="text-[#9ca3af] text-sm">
              Default password: <span className="font-mono text-purple-400">Bright1992</span>
            </p>
            <p className="text-[#9ca3af] text-sm">
              You can change the password anytime using the "Change Password" button in the Security section. Changed passwords are stored in browser localStorage.
            </p>
            <div className="mt-4 bg-[#1a1a1a] rounded p-4 border border-[#333333]">
              <h4 className="font-semibold text-[#e5e5e5] text-sm mb-2">Tips:</h4>
              <ul className="space-y-1 text-sm text-[#9ca3af]">
                <li>✅ Change the default password immediately</li>
                <li>✅ Use a strong password (8+ chars, numbers, symbols)</li>
                <li>✅ Lock settings when leaving the computer</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Best Practices */}
        <div className="bg-[#2a2a2a] border border-[#333333] rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <FaCheckCircle className="text-green-500" size={24} />
            <h2 className="text-xl font-semibold text-[#e5e5e5]">General Security Best Practices</h2>
          </div>
          <div className="space-y-3">
            <div className="bg-[#1a1a1a] rounded p-4 border border-[#333333]">
              <h4 className="font-semibold text-[#e5e5e5] text-sm mb-2">Essential Security Practices:</h4>
              <ul className="space-y-2 text-sm text-[#9ca3af]">
                <li>✅ Use a password manager (1Password, LastPass, Bitwarden)</li>
                <li>✅ Enable 2FA on all API provider accounts</li>
                <li>✅ Use HTTPS for all communications</li>
                <li>✅ Keep browser and software updated</li>
                <li>✅ Monitor API dashboards weekly for unusual activity</li>
                <li>✅ Immediately revoke any exposed API keys</li>
                <li>✅ Use different keys for dev, staging, and production</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 p-6 bg-[#2a2a2a] border border-[#333333] rounded-lg text-center">
          <p className="text-[#9ca3af] text-sm">
            Security is everyone's responsibility. If you notice any suspicious activity, please reach out to your security team immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
