'use client';
// @ts-nocheck

import { useState, useEffect } from 'react';
import { FaCog, FaCreditCard, FaKey, FaShieldAlt, FaUniversity } from 'react-icons/fa';
import { SiStripe } from 'react-icons/si';
import { supabase } from '@/lib/supabaseClient';

export default function PaymentSettingsPage() {
  const [activeTab, setActiveTab] = useState<'stripe' | 'company' | 'security'>('stripe');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Stripe Settings
  const [stripeSettings, setStripeSettings] = useState({
    publishable_key: '',
    secret_key: '',
    webhook_secret: '',
    enabled: false,
  });

  // Company Bank Account
  const [companyBankAccount, setCompanyBankAccount] = useState({
    account_name: '',
    bank_name: '',
    routing_number: '',
    account_number: '',
    account_type: 'checking',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);

    // Load Stripe settings
    const { data: stripe } = await supabase
      .from('company_settings')
      .select('setting_value')
      .eq('setting_key', 'stripe_config')
      .single();

    if (stripe && stripe.setting_value) {
      setStripeSettings(stripe.setting_value as any);
    }

    // Load bank account
    const { data: bank } = await supabase
      .from('company_settings')
      .select('setting_value')
      .eq('setting_key', 'bank_account')
      .single();

    if (bank && bank.setting_value) {
      setCompanyBankAccount(bank.setting_value as any);
    }

    setLoading(false);
  }

  async function saveStripeSettings() {
    setLoading(true);
    
    const { data: existing } = await supabase
      .from('company_settings')
      .select('id')
      .eq('setting_key', 'stripe_config')
      .single();

    if (existing) {
      await supabase
        .from('company_settings')
        .update({ setting_value: stripeSettings })
        .eq('setting_key', 'stripe_config');
    } else {
      await supabase
        .from('company_settings')
        .insert({
          setting_key: 'stripe_config',
          setting_value: stripeSettings,
        });
    }

    // Also update environment variable instructions
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setLoading(false);
  }

  async function saveBankAccount() {
    setLoading(true);
    
    const { data: existing } = await supabase
      .from('company_settings')
      .select('id')
      .eq('setting_key', 'bank_account')
      .single();

    if (existing) {
      await supabase
        .from('company_settings')
        .update({ setting_value: companyBankAccount })
        .eq('setting_key', 'bank_account');
    } else {
      await supabase
        .from('company_settings')
        .insert({
          setting_key: 'bank_account',
          setting_value: companyBankAccount,
        });
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setLoading(false);
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#e5e5e5' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 700,
          marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          <FaCog style={{ display: 'inline', marginRight: '0.5rem' }} />
          Payment Processing Settings
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '16px' }}>
          Configure secure payment processing and company banking information
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid #3a3a3a', marginBottom: '2rem' }}>
        {[
          { id: 'stripe', label: 'Stripe Integration', icon: <SiStripe /> },
          { id: 'company', label: 'Company Bank Account', icon: <FaUniversity /> },
          { id: 'security', label: 'Security Info', icon: <FaShieldAlt /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: `3px solid ${activeTab === tab.id ? '#667eea' : 'transparent'}`,
              color: activeTab === tab.id ? '#667eea' : '#9ca3af',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              transition: 'all 0.2s'
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {saved && (
        <div style={{
          padding: '1rem',
          background: '#10b981',
          color: 'white',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          fontWeight: 600
        }}>
          ✓ Settings saved successfully!
        </div>
      )}

      {/* Stripe Integration Tab */}
      {activeTab === 'stripe' && (
        <div>
          <div style={{ background: '#2a2a2a', borderRadius: '12px', padding: '2rem', border: '1px solid #3a3a3a', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SiStripe style={{ color: '#635BFF' }} />
              Stripe Configuration
            </h2>
            <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
              Stripe handles secure payment processing without storing sensitive card or bank account details on your servers.
              Customer payment information is encrypted and stored securely in Stripe's PCI-compliant infrastructure.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#9ca3af' }}>
                  <FaKey />
                  Stripe Publishable Key
                </label>
                <input
                  type="text"
                  placeholder="pk_test_..."
                  value={stripeSettings.publishable_key}
                  onChange={(e) => setStripeSettings({...stripeSettings, publishable_key: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#1a1a1a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e5e5e5',
                    fontFamily: 'monospace'
                  }}
                />
                <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '0.5rem' }}>
                  Used for client-side Stripe.js integration
                </p>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#9ca3af' }}>
                  <FaKey />
                  Stripe Secret Key
                </label>
                <input
                  type="password"
                  placeholder="sk_test_..."
                  value={stripeSettings.secret_key}
                  onChange={(e) => setStripeSettings({...stripeSettings, secret_key: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#1a1a1a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e5e5e5',
                    fontFamily: 'monospace'
                  }}
                />
                <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '0.5rem' }}>
                  Used for server-side API calls (keep confidential)
                </p>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#9ca3af' }}>
                  <FaKey />
                  Webhook Signing Secret (Optional)
                </label>
                <input
                  type="password"
                  placeholder="whsec_..."
                  value={stripeSettings.webhook_secret}
                  onChange={(e) => setStripeSettings({...stripeSettings, webhook_secret: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#1a1a1a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e5e5e5',
                    fontFamily: 'monospace'
                  }}
                />
                <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '0.5rem' }}>
                  For verifying webhook events from Stripe
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={stripeSettings.enabled}
                  onChange={(e) => setStripeSettings({...stripeSettings, enabled: e.target.checked})}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <label style={{ cursor: 'pointer' }}>Enable Stripe payment processing</label>
              </div>

              <button
                onClick={saveStripeSettings}
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: loading ? '#3a3a3a' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginTop: '1rem'
                }}
              >
                {loading ? 'Saving...' : 'Save Stripe Settings'}
              </button>
            </div>
          </div>

          {/* Setup Instructions */}
          <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '2rem', border: '1px solid #3a3a3a' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '1rem' }}>Getting Started with Stripe</h3>
            <ol style={{ marginLeft: '1.5rem', color: '#9ca3af', lineHeight: '1.8' }}>
              <li>Create a Stripe account at <a href="https://stripe.com" target="_blank" style={{ color: '#667eea' }}>stripe.com</a></li>
              <li>Get your API keys from the Stripe Dashboard → Developers → API keys</li>
              <li>Use <strong>Test mode</strong> keys for testing (pk_test_... and sk_test_...)</li>
              <li>Switch to <strong>Live mode</strong> keys when ready for production</li>
              <li>Add these keys to your <code style={{ background: '#2a2a2a', padding: '2px 6px', borderRadius: '4px' }}>.env.local</code> file:
                <pre style={{ background: '#2a2a2a', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem', overflow: 'auto' }}>
{`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...`}
                </pre>
              </li>
              <li>Restart your development server after adding environment variables</li>
            </ol>
          </div>
        </div>
      )}

      {/* Company Bank Account Tab */}
      {activeTab === 'company' && (
        <div style={{ background: '#2a2a2a', borderRadius: '12px', padding: '2rem', border: '1px solid #3a3a3a', maxWidth: '600px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '1rem' }}>
            <FaUniversity style={{ display: 'inline', marginRight: '0.5rem' }} />
            Company Receiving Account
          </h2>
          <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
            Configure where customer payments should be deposited. With Stripe, payments are automatically transferred to your bank account.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>Account Holder Name</label>
              <input
                value={companyBankAccount.account_name}
                onChange={(e) => setCompanyBankAccount({...companyBankAccount, account_name: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#1a1a1a',
                  border: '1px solid #3a3a3a',
                  borderRadius: '8px',
                  color: '#e5e5e5'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af' }}>Bank Name</label>
              <input
                value={companyBankAccount.bank_name}
                onChange={(e) => setCompanyBankAccount({...companyBankAccount, bank_name: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#1a1a1a',
                  border: '1px solid #3a3a3a',
                  borderRadius: '8px',
                  color: '#e5e5e5'
                }}
              />
            </div>

            <button
              onClick={saveBankAccount}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                background: loading ? '#3a3a3a' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '1rem'
              }}
            >
              {loading ? 'Saving...' : 'Save Bank Account'}
            </button>
          </div>
        </div>
      )}

      {/* Security Info Tab */}
      {activeTab === 'security' && (
        <div>
          <div style={{ background: '#2a2a2a', borderRadius: '12px', padding: '2rem', border: '1px solid #3a3a3a', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaShieldAlt style={{ color: '#10b981' }} />
              Security & Privacy
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ padding: '1.5rem', background: '#1a1a1a', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '0.5rem', color: '#10b981' }}>
                  ✓ Customer Payment Data Protection
                </h3>
                <p style={{ color: '#9ca3af', marginBottom: '0' }}>
                  <strong>Employees CANNOT see:</strong> Full bank account numbers, routing numbers, or complete card numbers.
                  Only the last 4 digits are visible for identification purposes.
                </p>
              </div>

              <div style={{ padding: '1.5rem', background: '#1a1a1a', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '0.5rem', color: '#10b981' }}>
                  ✓ PCI DSS Compliance
                </h3>
                <p style={{ color: '#9ca3af', marginBottom: '0' }}>
                  Stripe handles all sensitive payment data and is PCI DSS Level 1 certified (highest level of compliance).
                  Your application never stores raw card numbers or bank account details.
                </p>
              </div>

              <div style={{ padding: '1.5rem', background: '#1a1a1a', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '0.5rem', color: '#10b981' }}>
                  ✓ Encrypted Storage
                </h3>
                <p style={{ color: '#9ca3af', marginBottom: '0' }}>
                  Payment methods are stored as Stripe tokens/IDs, not actual account details.
                  Stripe's infrastructure uses encryption at rest and in transit.
                </p>
              </div>

              <div style={{ padding: '1.5rem', background: '#1a1a1a', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '0.5rem', color: '#10b981' }}>
                  ✓ Audit Trail
                </h3>
                <p style={{ color: '#9ca3af', marginBottom: '0' }}>
                  All payment transactions are logged with timestamps, amounts, and statuses.
                  Failed payment attempts are recorded for troubleshooting.
                </p>
              </div>

              <div style={{ padding: '1.5rem', background: '#1a1a1a', borderRadius: '8px', borderLeft: '4px solid #667eea' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '0.5rem', color: '#667eea' }}>
                  What Employees Can See:
                </h3>
                <ul style={{ color: '#9ca3af', marginLeft: '1.5rem' }}>
                  <li>Last 4 digits of account/card</li>
                  <li>Payment method type (Bank Account or Card)</li>
                  <li>Bank name or card brand</li>
                  <li>Payment history and status</li>
                  <li>Transaction amounts and dates</li>
                </ul>
              </div>

              <div style={{ padding: '1.5rem', background: '#1a1a1a', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '0.5rem', color: '#ef4444' }}>
                  What Employees CANNOT See:
                </h3>
                <ul style={{ color: '#9ca3af', marginLeft: '1.5rem' }}>
                  <li>Full account numbers</li>
                  <li>Routing numbers</li>
                  <li>Full card numbers</li>
                  <li>CVV/CVC codes</li>
                  <li>Card expiration dates (full)</li>
                  <li>Customer SSN or Tax ID</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
