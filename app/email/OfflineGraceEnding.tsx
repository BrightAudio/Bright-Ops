import React from 'react';

interface OfflineGraceEndingProps {
  userName: string;
  organizationName: string;
  hoursRemaining: number;
  renewUrl: string;
}

export default function OfflineGraceEnding({
  userName,
  organizationName,
  hoursRemaining,
  renewUrl,
}: OfflineGraceEndingProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white', borderRadius: '8px', padding: '40px', borderLeft: '4px solid #dc2626' }}>
        {/* Alert Header */}
        <h1 style={{ color: '#dc2626', marginBottom: '24px', fontSize: '24px' }}>
          ⏱️ Go Online Within {hoursRemaining} Hours
        </h1>

        {/* Main Content */}
        <p style={{ color: '#374151', fontSize: '16px', lineHeight: '1.6', marginBottom: '16px' }}>
          Hi {userName},
        </p>

        <p style={{ color: '#374151', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>
          Your <strong>{organizationName}</strong> account is running on borrowed time. You have <strong style={{ color: '#dc2626' }}>{hoursRemaining} hours</strong> to connect to the internet and renew your license.
        </p>

        {/* Warning */}
        <div style={{ backgroundColor: '#fee2e2', border: '2px solid #dc2626', borderRadius: '6px', padding: '20px', marginBottom: '24px' }}>
          <p style={{ color: '#7f1d1d', margin: '0', fontSize: '15px', fontWeight: 'bold', marginBottom: '12px' }}>
            🔴 Your 7-Day Grace Period is Ending
          </p>
          <p style={{ color: '#7f1d1d', margin: '0', fontSize: '14px', marginBottom: '8px' }}>
            Once this expires, Bright Ops will lock to read-only mode:
          </p>
          <ul style={{ color: '#7f1d1d', margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '14px' }}>
            <li>❌ No new jobs can be created</li>
            <li>❌ No inventory changes allowed</li>
            <li>❌ No returns or adjustments possible</li>
            <li>✅ Can still view existing data</li>
          </ul>
        </div>

        {/* What to do */}
        <div style={{ backgroundColor: '#dbeafe', border: '1px solid #3b82f6', borderRadius: '6px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ color: '#1e40af', margin: '0', fontSize: '14px' }}>
            <strong>✅ Here's what to do:</strong>
          </p>
          <ol style={{ color: '#1e40af', margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '14px' }}>
            <li>Connect to the internet with your device</li>
            <li>Open Bright Ops (it will sync automatically)</li>
            <li>Renew your subscription below</li>
          </ol>
        </div>

        {/* CTA - Make it prominent */}
        <p style={{ marginBottom: '24px', textAlign: 'center' }}>
          <a
            href={renewUrl}
            style={{
              backgroundColor: '#dc2626',
              color: 'white',
              padding: '16px 40px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'inline-block',
            }}
          >
            🔄 Renew Subscription Now
          </a>
        </p>

        {/* Info */}
        <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6' }}>
          <strong>📝 Note:</strong> When you renew, your grace period resets and you'll be back to full functionality immediately.
        </p>

        {/* Footer */}
        <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
          Questions? Contact us:<br />
          📧 support@brightops.com
        </p>

        <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '16px' }}>
          Bright Ops © 2026. All rights reserved.
        </p>
      </div>
    </div>
  );
}
