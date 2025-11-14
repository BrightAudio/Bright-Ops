'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface LeadsPasswordPromptProps {
  onClose: () => void;
}

export default function LeadsPasswordPrompt({ onClose }: LeadsPasswordPromptProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple password check - you can change this password
    const LEADS_PASSWORD = 'brightleads2025';
    
    if (password === LEADS_PASSWORD) {
      // Store in sessionStorage so user doesn't have to re-enter
      sessionStorage.setItem('leadsAccess', 'granted');
      router.push('/app/dashboard/leads');
      onClose();
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div 
        className="rounded-lg shadow-xl p-8 w-full max-w-md"
        style={{ background: '#2a2a2a' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <h2 
            className="text-2xl font-bold mb-2"
            style={{
              fontFamily: "'Playfair Display', serif",
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            LEADS PORTAL
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>
            Enter password to access the Leads Portal
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter password"
              autoFocus
              className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2"
              style={{
                background: '#1a1a1a',
                border: '1px solid #333333',
                color: '#e5e5e5'
              }}
            />
            {error && (
              <p className="mt-2 text-sm" style={{ color: '#ef4444' }}>
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 px-4 py-3 text-white rounded-lg font-medium transition-all"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }}
            >
              Access Portal
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-lg font-medium"
              style={{
                background: '#333333',
                color: '#e5e5e5',
                border: '1px solid #444444'
              }}
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 text-center" style={{ borderTop: '1px solid #333333' }}>
          <p style={{ color: '#6b7280', fontSize: '12px' }}>
            Default password: <code style={{ color: '#667eea' }}>brightleads2025</code>
          </p>
        </div>
      </div>
    </div>
  );
}
