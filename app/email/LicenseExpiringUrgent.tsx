import React from 'react';

interface LicenseExpiringUrgentProps {
  userName: string;
  organizationName: string;
  currentPlan: string;
  expirationDate: string;
  renewUrl: string;
}

export default function LicenseExpiringUrgent({
  userName,
  organizationName,
  currentPlan,
  expirationDate,
  renewUrl,
}: LicenseExpiringUrgentProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white', borderRadius: '8px', padding: '40px', borderLeft: '4px solid #dc2626' }}>
        {/* Alert Header */}
        <h1 style={{ color: '#dc2626', marginBottom: '24px', fontSize: '24px' }}>
          🚨 URGENT: License Expires Tomorrow
        </h1>

        {/* Main Content */}
        <p style={{ color: '#374151', fontSize: '16px', lineHeight: '1.6', marginBottom: '16px' }}>
          Hi {userName},
        </p>

        <p style={{ color: '#374151', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>
          Your <strong>{currentPlan}</strong> plan for <strong>{organizationName}</strong> <strong style={{ color: '#dc2626' }}>expires tomorrow on {expirationDate}</strong>. 
        </p>

        {/* Warning Box */}
        <div style={{ backgroundColor: '#fee2e2', border: '2px solid #dc2626', borderRadius: '6px', padding: '20px', marginBottom: '24px' }}>
          <p style={{ color: '#7f1d1d', margin: '0', fontSize: '15px', fontWeight: 'bold', marginBottom: '8px' }}>
            ⚠️ What happens when your license expires:
          </p>
          <ul style={{ color: '#7f1d1d', margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '14px' }}>
            <li>You'll have 7 days to sync with cloud</li>
            <li>After 7 days, app enters read-only mode</li>
            <li>No new jobs, inventory, or returns can be created</li>
          </ul>
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
            🔄 Renew Now (1 Click)
          </a>
        </p>

        {/* Info */}
        <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '6px', marginBottom: '24px' }}>
          <strong>💡 Tip:</strong> Your payment method on file is {`${organizationName}@account`}. If renewal fails, we'll notify you with a new payment method.
        </p>

        {/* Footer */}
        <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
          Need help? Contact support immediately:<br />
          📧 support@brightops.com | 📞 1-800-BRIGHT-OPS
        </p>

        <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '16px' }}>
          Bright Ops © 2026. All rights reserved.
        </p>
      </div>
    </div>
  );
}
