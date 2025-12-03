'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';

export default function DebugPage() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const envStatus = { hasUrl, hasKey };

  const [employeeName, setEmployeeName] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [employeePhone, setEmployeePhone] = useState('');
  const [employeeRole, setEmployeeRole] = useState<'crew' | 'manager'>('crew');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  async function handleCreateEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeName) return;

    setCreating(true);
    setMessage('');
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase
        .from('employees')
        .insert({
          name: employeeName,
          email: employeeEmail || null,
          phone: employeePhone || null,
          role: employeeRole
        });

      if (error) throw error;

      setMessage(`✓ Employee created: ${employeeName} (${employeeRole})`);
      setEmployeeName('');
      setEmployeeEmail('');
      setEmployeePhone('');
      setEmployeeRole('crew');
    } catch (err: any) {
      setMessage(`✗ Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <main style={{ background: '#18181b', color: '#fff', minHeight: '100vh', padding: '2rem', fontFamily: 'monospace' }}>
      <h1 style={{ color: '#fbbf24', fontSize: '2rem', marginBottom: '1rem' }}>Debug: Supabase Environment</h1>
      <pre style={{ background: '#27272a', padding: '1rem', borderRadius: '8px', fontSize: '1.1rem', marginBottom: '2rem' }}>
        {JSON.stringify(envStatus, null, 2)}
      </pre>
      {(!hasUrl || !hasKey) && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', maxWidth: '500px', marginBottom: '2rem' }}>
          <strong>Missing environment variables!</strong>
          <p style={{ marginTop: '0.5rem' }}>
            Please ensure <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> are set in your <code>.env.local</code> file and restart the dev server.
          </p>
        </div>
      )}

      <div style={{ background: '#27272a', padding: '1.5rem', borderRadius: '8px', maxWidth: '600px', marginTop: '2rem' }}>
        <h2 style={{ color: '#fbbf24', fontSize: '1.5rem', marginBottom: '1rem' }}>Create Employee</h2>
        <form onSubmit={handleCreateEmployee}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa' }}>Name *</label>
            <input
              type="text"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              required
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                background: '#18181b', 
                border: '1px solid #3f3f46', 
                borderRadius: '4px',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa' }}>Email</label>
            <input
              type="email"
              value={employeeEmail}
              onChange={(e) => setEmployeeEmail(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                background: '#18181b', 
                border: '1px solid #3f3f46', 
                borderRadius: '4px',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa' }}>Phone</label>
            <input
              type="tel"
              value={employeePhone}
              onChange={(e) => setEmployeePhone(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                background: '#18181b', 
                border: '1px solid #3f3f46', 
                borderRadius: '4px',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa' }}>Role *</label>
            <select
              value={employeeRole}
              onChange={(e) => setEmployeeRole(e.target.value as 'crew' | 'manager')}
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                background: '#18181b', 
                border: '1px solid #3f3f46', 
                borderRadius: '4px',
                color: '#fff',
                fontSize: '1rem'
              }}
            >
              <option value="crew">Crew</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={creating}
            style={{ 
              background: '#fbbf24', 
              color: '#18181b', 
              padding: '0.75rem 1.5rem', 
              border: 'none', 
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: creating ? 'not-allowed' : 'pointer',
              opacity: creating ? 0.5 : 1
            }}
          >
            {creating ? 'Creating...' : 'Create Employee'}
          </button>
        </form>

        {message && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            background: message.startsWith('✓') ? '#065f46' : '#991b1b',
            borderRadius: '4px',
            color: '#fff'
          }}>
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
