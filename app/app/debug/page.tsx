export default function DebugPage() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const envStatus = { hasUrl, hasKey };

  return (
    <main style={{ background: '#18181b', color: '#fff', minHeight: '100vh', padding: '2rem', fontFamily: 'monospace' }}>
      <h1 style={{ color: '#fbbf24', fontSize: '2rem', marginBottom: '1rem' }}>Debug: Supabase Environment</h1>
      <pre style={{ background: '#27272a', padding: '1rem', borderRadius: '8px', fontSize: '1.1rem', marginBottom: '2rem' }}>
        {JSON.stringify(envStatus, null, 2)}
      </pre>
      {(!hasUrl || !hasKey) && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', maxWidth: '500px' }}>
          <strong>Missing environment variables!</strong>
          <p style={{ marginTop: '0.5rem' }}>
            Please ensure <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> are set in your <code>.env.local</code> file and restart the dev server.
          </p>
        </div>
      )}
    </main>
  );
}
