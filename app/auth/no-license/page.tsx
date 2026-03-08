export default function NoLicensePage() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
    >
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxWidth: '600px',
        width: '100%',
        padding: '3rem'
      }}>
        <div className="text-center">
          <div style={{
            fontSize: '4rem',
            marginBottom: '1rem',
            color: '#667eea'
          }}>
            🔐
          </div>
          
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#1a1a1a',
            marginBottom: '1rem'
          }}>
            No Active License
          </h1>
          
          <p style={{
            fontSize: '1.1rem',
            color: '#666',
            marginBottom: '2rem'
          }}>
            Your account doesn&apos;t have an active license. To access Bright Ops, you need to subscribe to a plan.
          </p>

          <div style={{
            backgroundColor: '#f5f5f5',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '2rem',
            textAlign: 'left'
          }}>
            <h3 style={{
              fontWeight: 'bold',
              marginBottom: '1rem',
              color: '#1a1a1a'
            }}>
              Available Plans:
            </h3>
            <ul style={{ color: '#666', lineHeight: '1.8' }}>
              <li>✓ <strong>Starter</strong> - $79/month - Basic warehouse management</li>
              <li>✓ <strong>Pro</strong> - $149/month - Team management & analytics</li>
              <li>✓ <strong>Enterprise</strong> - $399/month - Advanced features & API access</li>
            </ul>
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            flexDirection: 'column'
          }}>
            <a
              href="https://bright-ops.vercel.app/pricing"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                width: '100%',
                padding: '1rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                textAlign: 'center',
                transition: 'transform 0.2s',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Subscribe Now
            </a>

            <button
              onClick={() => {
                // For Electron app, close the window
                if (typeof window !== 'undefined' && (window as any).electron) {
                  (window as any).electron.app.quit();
                } else {
                  // Web fallback - redirect to home
                  window.location.href = '/';
                }
              }}
              style={{
                padding: '1rem',
                background: 'transparent',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Exit Application
            </button>
          </div>

          <p style={{
            marginTop: '2rem',
            fontSize: '0.9rem',
            color: '#999'
          }}>
            Need help? Contact support at support@brightops.com
          </p>
        </div>
      </div>
    </div>
  );
}
