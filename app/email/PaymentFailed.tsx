import React from 'react';

interface PaymentFailedProps {
  userName: string;
  organizationName: string;
  failureReason: string;
  currentPlan: string;
  updatePaymentUrl: string;
  supportEmail: string;
}

export default function PaymentFailed({
  userName,
  organizationName,
  failureReason,
  currentPlan,
  updatePaymentUrl,
  supportEmail,
}: PaymentFailedProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white', borderRadius: '8px', padding: '40px' }}>
        {/* Header */}
        <h1 style={{ color: '#dc2626', marginBottom: '24px', fontSize: '24px' }}>
          ❌ Payment Failed
        </h1>

        {/* Main Content */}
        <p style={{ color: '#374151', fontSize: '16px', lineHeight: '1.6', marginBottom: '16px' }}>
          Hi {userName},
        </p>

        <p style={{ color: '#374151', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>
          We weren't able to process your payment for <strong>{organizationName}</strong>'s <strong>{currentPlan}</strong> plan.
        </p>

        {/* Error Details */}
        <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '6px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ color: '#78350f', margin: '0', fontSize: '14px' }}>
            <strong>Reason:</strong> {failureReason}
          </p>
        </div>

        {/* Action Required */}
        <div style={{ backgroundColor: '#dbeafe', border: '1px solid #3b82f6', borderRadius: '6px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ color: '#1e40af', margin: '0', fontSize: '14px', fontWeight: 'bold' }}>
            ✋ Action Required: Update your payment method
          </p>
        </div>

        {/* CTA */}
        <p style={{ marginBottom: '24px' }}>
          <a
            href={updatePaymentUrl}
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
            Update Payment Method
          </a>
        </p>

        {/* Consequences */}
        <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '6px', marginBottom: '24px' }}>
          <p style={{ color: '#374151', margin: '0', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
            ⏰ What happens next:
          </p>
          <ul style={{ color: '#6b7280', margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '14px' }}>
            <li>You have until tomorrow to update your payment</li>
            <li>If unsuccessful, your license will expire</li>
            <li>You'll enter a 7-day grace period to sync data</li>
          </ul>
        </div>

        {/* Common Issues */}
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ color: '#166534', margin: '0', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
            💡 Common reasons & fixes:
          </p>
          <ul style={{ color: '#166534', margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '13px' }}>
            <li><strong>Card expired:</strong> Update with a fresh card</li>
            <li><strong>Insufficient funds:</strong> Check available balance</li>
            <li><strong>Address mismatch:</strong> Verify billing address matches bank records</li>
            <li><strong>International card:</strong> Some cards require special verification</li>
          </ul>
        </div>

        {/* Support */}
        <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
          Still having trouble? Our support team is here to help:<br />
          📧 {supportEmail}<br />
          💬 Chat with us in-app
        </p>

        <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '16px' }}>
          Bright Ops © 2026. All rights reserved.
        </p>
      </div>
    </div>
  );
}
