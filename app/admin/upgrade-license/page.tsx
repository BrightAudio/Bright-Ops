'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function UpgradeLicensePage() {
  const router = useRouter();
  const [secretId, setSecretId] = useState('');
  const [plan, setPlan] = useState('pro');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const sb = supabaseBrowser();
      const { data: { user } } = await sb.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Only allow user with specific email (replace with your email)
      if (user.email === 'bright@example.com') {
        setIsAuthorized(true);
      } else {
        router.push('/app/dashboard');
      }
      
      setCheckingAuth(false);
    }

    checkAuth();
  }, [router]);

  async function handleUpgrade() {
    if (!secretId.trim()) {
      setMessage('Please enter a Secret ID');
      setIsError(true);
      return;
    }

    setLoading(true);
    setMessage('');
    setIsError(false);

    try {
      const response = await fetch('/api/admin/upgrade-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretId: secretId.trim(),
          plan: plan
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(`Error: ${data.error}`);
        setIsError(true);
      } else {
        setMessage(`✅ ${data.message}`);
        setIsError(false);
        setSecretId('');
      }
    } catch (error) {
      setMessage(`Error: ${(error as any).message}`);
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p style={{ color: '#6b7280' }}>Checking authorization...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#dc2626' }}>Access Denied</h1>
          <p style={{ color: '#6b7280' }}>You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: '2rem',
        maxWidth: '450px',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          color: '#111'
        }}>
          Upgrade License (TEST ONLY)
        </h1>
        <p style={{
          color: '#6b7280',
          marginBottom: '2rem',
          fontSize: '0.875rem'
        }}>
          Enter your organization's Secret ID and select a plan to upgrade.
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Secret ID
          </label>
          <input
            type="text"
            value={secretId}
            onChange={(e) => setSecretId(e.target.value)}
            placeholder="e.g., ad259c8e-efab-4a42-ac5c-b31c39a420d1"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              boxSizing: 'border-box',
              fontFamily: 'monospace'
            }}
            disabled={loading}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Plan
          </label>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              boxSizing: 'border-box'
            }}
            disabled={loading}
          >
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        {message && (
          <div style={{
            padding: '0.75rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.875rem',
            backgroundColor: isError ? '#fee2e2' : '#dcfce7',
            color: isError ? '#991b1b' : '#166534',
            border: `1px solid ${isError ? '#fecaca' : '#bbf7d0'}`
          }}>
            {message}
          </div>
        )}

        <button
          onClick={handleUpgrade}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: loading ? '#d1d5db' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!loading) (e.target as any).style.backgroundColor = '#1d4ed8';
          }}
          onMouseLeave={(e) => {
            if (!loading) (e.target as any).style.backgroundColor = '#2563eb';
          }}
        >
          {loading ? 'Upgrading...' : 'Upgrade License'}
        </button>
      </div>
    </div>
  );
}
