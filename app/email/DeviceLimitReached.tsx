import React from 'react';

interface DeviceLimitReachedProps {
  userName: string;
  organizationName: string;
  currentPlan: string;
  deviceLimit: number;
  attemptedDevice: string;
  manageDevicesUrl: string;
  upgradeUrl: string;
}

export default function DeviceLimitReached({
  userName,
  organizationName,
  currentPlan,
  deviceLimit,
  attemptedDevice,
  manageDevicesUrl,
  upgradeUrl,
}: DeviceLimitReachedProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white', borderRadius: '8px', padding: '40px' }}>
        {/* Header */}
        <h1 style={{ color: '#f59e0b', marginBottom: '24px', fontSize: '24px' }}>
          ⚠️ Device Limit Reached
        </h1>

        {/* Main Content */}
        <p style={{ color: '#374151', fontSize: '16px', lineHeight: '1.6', marginBottom: '16px' }}>
          Hi {userName},
        </p>

        <p style={{ color: '#374151', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>
          You've reached the device limit for your <strong>{currentPlan}</strong> plan at <strong>{organizationName}</strong>. 
          Your {currentPlan} plan allows <strong>{deviceLimit} device(s)</strong>, and you've now used all of them.
        </p>

        {/* Device Info */}
        <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '6px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ color: '#78350f', margin: '0', fontSize: '14px' }}>
            <strong>Device that couldn't be activated:</strong> {attemptedDevice}
          </p>
        </div>

        {/* Options */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ color: '#374151', fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
            You have 2 options:
          </p>

          {/* Option 1: Replace Device */}
          <div style={{ backgroundColor: '#dbeafe', borderRadius: '6px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: '#1e40af', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
              Option 1: Replace an Old Device
            </p>
            <p style={{ color: '#1e40af', fontSize: '14px', marginBottom: '12px' }}>
              Unbind one of your current devices and use that license slot for {attemptedDevice}.
            </p>
            <a
              href={manageDevicesUrl}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'inline-block',
              }}
            >
              Manage Devices
            </a>
          </div>

          {/* Option 2: Upgrade */}
          <div style={{ backgroundColor: '#d1fae5', borderRadius: '6px', padding: '16px' }}>
            <p style={{ color: '#065f46', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
              Option 2: Upgrade Your Plan
            </p>
            <p style={{ color: '#065f46', fontSize: '14px', marginBottom: '12px' }}>
              Get more device slots with Pro (3 devices) or Enterprise (10 devices).
            </p>
            <a
              href={upgradeUrl}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '4px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'inline-block',
              }}
            >
              See Upgrade Options
            </a>
          </div>
        </div>

        {/* Device Limits by Plan */}
        <div style={{ backgroundColor: '#f3f4f6', borderRadius: '6px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ color: '#374151', fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
            📊 Device Limits by Plan:
          </p>
          <table style={{ width: '100%', fontSize: '13px', color: '#6b7280' }}>
            <tbody>
              <tr>
                <td style={{ paddingBottom: '8px' }}>Starter</td>
                <td style={{ textAlign: 'right', paddingBottom: '8px' }}>1 device</td>
              </tr>
              <tr>
                <td style={{ paddingBottom: '8px' }}>Pro</td>
                <td style={{ textAlign: 'right', paddingBottom: '8px' }}>3 devices</td>
              </tr>
              <tr>
                <td>Enterprise</td>
                <td style={{ textAlign: 'right' }}>10 devices</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Why This Matters */}
        <p style={{ color: '#6b7280', fontSize: '13px', lineHeight: '1.6', fontStyle: 'italic', marginBottom: '24px' }}>
          <strong>Why the limit?</strong> Device licenses prevent unauthorized sharing while ensuring data security for your organization.
        </p>

        {/* Footer */}
        <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
          Need help deciding? Our support team can guide you:<br />
          📧 support@brightops.com | 💬 Chat in-app
        </p>

        <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '16px' }}>
          Bright Ops © 2026. All rights reserved.
        </p>
      </div>
    </div>
  );
}
