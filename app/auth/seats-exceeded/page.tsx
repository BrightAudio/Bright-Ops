'use client';

import { useSearchParams } from 'next/navigation';

export default function SeatsExceededPage() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'starter';
  const limit = parseInt(searchParams.get('limit') || '2');
  const current = parseInt(searchParams.get('current') || '0');

  const planNames: Record<string, { name: string; nextPlan: string }> = {
    starter: { name: 'Starter', nextPlan: 'pro' },
    pro: { name: 'Pro', nextPlan: 'enterprise' },
    enterprise: { name: 'Enterprise', nextPlan: 'enterprise' },
  };

  const planInfo = planNames[plan] || { name: 'Starter', nextPlan: 'pro' };
  const nextPlanNames: Record<string, string> = {
    starter: 'Pro',
    pro: 'Enterprise',
    enterprise: 'Enterprise',
  };

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
            👥
          </div>
          
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#1a1a1a',
            marginBottom: '1rem'
          }}>
            Seat Limit Reached
          </h1>
          
          <p style={{
            fontSize: '1.1rem',
            color: '#666',
            marginBottom: '2rem'
          }}>
            Your {planInfo.name} plan supports {limit} active {limit === 1 ? 'user' : 'users'}. You currently have {current} {current === 1 ? 'user' : 'users'} logged in.
          </p>

          <div style={{
            backgroundColor: '#fff3cd',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '2rem',
            textAlign: 'left',
            borderLeft: '4px solid #ffc107'
          }}>
            <h3 style={{
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              color: '#856404'
            }}>
              What you can do:
            </h3>
            <ul style={{ color: '#856404', lineHeight: '1.8', marginLeft: '1rem' }}>
              <li>• Have an existing user log out, then try again</li>
              <li>• Upgrade to {nextPlanNames[plan]} for more seats</li>
              <li>• Contact support if you think this is an error</li>
            </ul>
          </div>

          {plan !== 'enterprise' && (
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
                <li>✓ <strong>Starter</strong> - $79/month - 2 users</li>
                <li>✓ <strong>Pro</strong> - $149/month - 5 users</li>
                <li>✓ <strong>Enterprise</strong> - $399/month - Unlimited users</li>
              </ul>
            </div>
          )}

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
              View Upgrade Options
            </a>

            <button
              onClick={() => {
                // For Electron app, close the window
                if (typeof window !== 'undefined' && (window as any).electron) {
                  (window as any).electron.app.quit();
                } else {
                  // Web fallback - redirect to home
                  window.location.href = '/auth/login';
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
              Back to Login
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
