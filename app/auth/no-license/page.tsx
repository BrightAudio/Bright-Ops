'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function NoLicensePage() {
  const [licenseKey, setLicenseKey] = useState('');
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // Auto-check for existing license on load
  useEffect(() => {
    async function autoCheck() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setChecking(false);
          return;
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!profile?.organization_id) {
          setChecking(false);
          return;
        }

        const { data: license } = await supabase
          .from('licenses')
          .select('status')
          .eq('organization_id', profile.organization_id)
          .single();

        if (license && (license.status === 'active' || license.status === 'trialing' || license.status === 'warning')) {
          window.location.href = '/app/warehouse';
          return;
        }
      } catch {
        // No license found, show the page
      }
      setChecking(false);
    }
    autoCheck();
  }, []);

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    if (!licenseKey.trim()) {
      setError('Please enter a license key.');
      return;
    }

    setActivating(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to activate a license.');
        setActivating(false);
        return;
      }

      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: licenseKey.trim(), userId: user.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Activation failed.');
        setActivating(false);
        return;
      }

      setSuccess(data.message || 'License activated!');
      setTimeout(() => {
        window.location.href = '/app/warehouse';
      }, 1500);
    } catch {
      setError('Network error. Please try again.');
      setActivating(false);
    }
  }

  if (checking) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #F07A1A 0%, #D4620E 100%)' }}
      >
        <div style={{ color: 'white', fontSize: '1.2rem' }}>Checking license...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #F07A1A 0%, #D4620E 100%)' }}
    >
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxWidth: '500px',
        width: '100%',
        padding: '2.5rem'
      }}>
        <div className="text-center">
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔑</div>

          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 'bold',
            color: '#1a1a1a',
            marginBottom: '0.5rem'
          }}>
            Activate Bright Ops
          </h1>

          <p style={{
            fontSize: '1rem',
            color: '#666',
            marginBottom: '1.5rem'
          }}>
            Enter your license key or subscribe to get started.
          </p>

          {/* License Key Input */}
          <form onSubmit={handleActivate}>
            <input
              type="text"
              placeholder="Enter license key (e.g. XXXX-XXXX-XXXX)"
              value={licenseKey}
              onChange={(e) => { setLicenseKey(e.target.value); setError(null); }}
              disabled={activating}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                border: '2px solid #ddd',
                fontSize: '1rem',
                textAlign: 'center',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '0.75rem',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#F07A1A'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#ddd'; }}
            />

            {error && (
              <div style={{
                color: '#dc2626',
                fontSize: '0.9rem',
                marginBottom: '0.75rem',
                padding: '0.5rem',
                backgroundColor: '#fef2f2',
                borderRadius: '6px',
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                color: '#16a34a',
                fontSize: '0.9rem',
                marginBottom: '0.75rem',
                padding: '0.5rem',
                backgroundColor: '#f0fdf4',
                borderRadius: '6px',
              }}>
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={activating || !licenseKey.trim()}
              style={{
                width: '100%',
                padding: '0.85rem',
                background: activating ? '#ccc' : 'linear-gradient(135deg, #F07A1A 0%, #D4620E 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '1rem',
                cursor: activating ? 'wait' : 'pointer',
                transition: 'transform 0.2s',
                marginBottom: '1rem',
              }}
              onMouseOver={(e) => { if (!activating) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {activating ? 'Activating...' : 'Activate License'}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            margin: '0.5rem 0 1rem',
          }}>
            <div style={{ flex: 1, height: '1px', background: '#ddd' }} />
            <span style={{ color: '#999', fontSize: '0.85rem' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#ddd' }} />
          </div>

          {/* Subscribe Button */}
          <a
            href="https://bright-ops.vercel.app/pricing"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              width: '100%',
              padding: '0.85rem',
              background: 'transparent',
              color: '#F07A1A',
              border: '2px solid #F07A1A',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '1rem',
              textDecoration: 'none',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxSizing: 'border-box',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#FFF7ED';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Subscribe — Get a License Key
          </a>

          <p style={{
            marginTop: '1.5rem',
            fontSize: '0.8rem',
            color: '#999',
            lineHeight: '1.5',
          }}>
            A license key will be emailed to you after purchase.<br />
            Need help? Contact support@brightops.com
          </p>
        </div>
      </div>
    </div>
  );
}
