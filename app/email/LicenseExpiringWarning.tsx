import React from 'react';

interface LicenseExpiringWarningProps {
  userName: string;
  organizationName: string;
  daysRemaining: number;
  currentPlan: string;
  expirationDate: string;
  upgradeUrl: string;
}

export default function LicenseExpiringWarning({
  userName,
  organizationName,
  daysRemaining,
  currentPlan,
  expirationDate,
  upgradeUrl,
}: LicenseExpiringWarningProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white', borderRadius: '8px', padding: '40px' }}>
        {/* Header */}
        <h1 style={{ color: '#1f2937', marginBottom: '24px', fontSize: '24px' }}>
          ⏰ License Expiring Soon
        </h1>

        {/* Main Content */}
        <p style={{ color: '#374151', fontSize: '16px', lineHeight: '1.6', marginBottom: '16px' }}>
          Hi {userName},
        </p>

        <p style={{ color: '#374151', fontSize: '16px', lineHeight: '1.6', marginBottom: '16px' }}>
          Your <strong>{currentPlan}</strong> plan for <strong>{organizationName}</strong> will expire in <strong>{daysRemaining} days</strong> on <strong>{expirationDate}</strong>.
        </p>

        <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '6px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ color: '#78350f', margin: '0', fontSize: '14px' }}>
            📝 <strong>Note:</strong> If your subscription expires, you'll still have a 7-day grace period to work offline before losing access.
          </p>
        </div>

        {/* CTA */}
        <p style={{ marginBottom: '24px' }}>
          <a
            href={upgradeUrl}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '12px 32px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'inline-block',
            }}
          >
            Renew Your Subscription
          </a>
        </p>

        {/* Footer Info */}
        <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
          Questions? Contact our support team at support@brightops.com or reply to this email.
        </p>

        <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '16px' }}>
          Bright Ops © 2026. All rights reserved.<br />
          Professional Inventory Management for AV Rental Companies
        </p>
      </div>
    </div>
  );
}
