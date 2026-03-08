import React from 'react';

interface LicenseUpgradedProps {
  userName: string;
  organizationName: string;
  previousPlan: string;
  newPlan: string;
  newFeatures: string[];
  deviceAllocation: number;
  tokenAllocation: number;
  dashboardUrl: string;
}

export default function LicenseUpgraded({
  userName,
  organizationName,
  previousPlan,
  newPlan,
  newFeatures,
  deviceAllocation,
  tokenAllocation,
  dashboardUrl,
}: LicenseUpgradedProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white', borderRadius: '8px', padding: '40px' }}>
        {/* Celebration Header */}
        <h1 style={{ color: '#059669', marginBottom: '24px', fontSize: '24px', textAlign: 'center' }}>
          🎉 Welcome to {newPlan}!
        </h1>

        {/* Main Content */}
        <p style={{ color: '#374151', fontSize: '16px', lineHeight: '1.6', marginBottom: '16px', textAlign: 'center' }}>
          Hi {userName},
        </p>

        <div style={{ backgroundColor: '#f0fdf4', border: '2px solid #10b981', borderRadius: '6px', padding: '20px', marginBottom: '24px', textAlign: 'center' }}>
          <p style={{ color: '#166534', margin: '0', fontSize: '16px', fontWeight: 'bold' }}>
            ✅ Your upgrade from {previousPlan} to <strong>{newPlan}</strong> is complete!
          </p>
        </div>

        {/* New Features */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ color: '#374151', fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>
            🚀 You now have access to:
          </p>
          <ul style={{ color: '#6b7280', margin: '0', paddingLeft: '20px', fontSize: '14px', lineHeight: '1.8' }}>
            {newFeatures.map((feature, idx) => (
              <li key={idx}>{feature}</li>
            ))}
          </ul>
        </div>

        {/* Resource Allocation */}
        <div style={{ backgroundColor: '#dbeafe', borderRadius: '6px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ color: '#1e40af', margin: '0', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
            📊 Your New Resources:
          </p>
          <ul style={{ color: '#1e40af', margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '14px' }}>
            <li>🖥️ <strong>{deviceAllocation} device licenses</strong> (previously limited)</li>
            <li>🤖 <strong>{tokenAllocation.toLocaleString()} AI tokens/month</strong> for advanced features</li>
            <li>📈 <strong>Advanced analytics</strong> dashboard</li>
            <li>⚡ <strong>Priority support</strong> via email & chat</li>
          </ul>
        </div>

        {/* Next Steps */}
        <div style={{ backgroundColor: '#f3f4f6', borderRadius: '6px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ color: '#374151', margin: '0', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
            ✨ Getting Started:
          </p>
          <ol style={{ color: '#6b7280', margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '14px' }}>
            <li>Restart Bright Ops to activate new features</li>
            <li>Check the dashboard for your new analytics dashboard</li>
            <li>Bind additional devices ({deviceAllocation} total allowed)</li>
            <li>Start using AI-powered features!</li>
          </ol>
        </div>

        {/* CTA */}
        <p style={{ marginBottom: '24px', textAlign: 'center' }}>
          <a
            href={dashboardUrl}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '12px 32px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'inline-block',
            }}
          >
            Go to Dashboard →
          </a>
        </p>

        {/* Success Message */}
        <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', textAlign: 'center', marginBottom: '24px' }}>
          Enjoy your new capabilities! We're excited to see what you'll build with {newPlan}.
        </p>

        {/* Footer */}
        <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
          Have questions about your new features? Check out our knowledge base or reach out:<br />
          📧 support@brightops.com
        </p>

        <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '16px', textAlign: 'center' }}>
          Bright Ops © 2026. All rights reserved.
        </p>
      </div>
    </div>
  );
}
