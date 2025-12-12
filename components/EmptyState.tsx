import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export default function EmptyState({
  icon = '📦',
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction
}: EmptyStateProps) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '4rem 2rem',
      background: '#f9fafb',
      borderRadius: '12px',
      border: '2px dashed #d1d5db'
    }}>
      <div style={{ fontSize: '64px', marginBottom: '1rem' }}>{icon}</div>
      
      <h3 style={{
        fontSize: '20px',
        fontWeight: '600',
        color: '#111827',
        marginBottom: '0.5rem'
      }}>
        {title}
      </h3>
      
      {message && (
        <p style={{
          color: '#6b7280',
          marginBottom: '1.5rem',
          maxWidth: '400px',
          margin: '0 auto 1.5rem'
        }}>
          {message}
        </p>
      )}
      
      <div style={{
        display: 'flex',
        gap: '1rem',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#5568d3'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#667eea'}
          >
            {actionLabel}
          </button>
        )}
        
        {secondaryActionLabel && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              color: '#667eea',
              border: '2px solid #667eea',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#667eea';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#667eea';
            }}
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
