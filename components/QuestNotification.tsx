import React, { useEffect, useState } from 'react';

export interface ToastNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number; // ms, 0 = manual dismiss
  icon?: string;
}

interface QuestNotificationProps {
  notification: ToastNotification | null;
  onDismiss: () => void;
}

export default function QuestNotification({ notification, onDismiss }: QuestNotificationProps) {
  useEffect(() => {
    if (!notification || notification.duration === 0) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, notification.duration || 5000);

    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  const bgColors = {
    success: '#dcfce7',
    info: '#dbeafe',
    warning: '#fef3c7',
    error: '#fee2e2',
  };

  const borderColors = {
    success: '#86efac',
    info: '#93c5fd',
    warning: '#fcd34d',
    error: '#fca5a5',
  };

  const textColors = {
    success: '#166534',
    info: '#1e40af',
    warning: '#92400e',
    error: '#991b1b',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '2rem',
        right: '2rem',
        maxWidth: '400px',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          backgroundColor: bgColors[notification.type],
          border: `2px solid ${borderColors[notification.type]}`,
          borderRadius: '0.5rem',
          padding: '1rem',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          animation: 'slideIn 0.3s ease-out',
        }}
      >
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          {notification.icon && (
            <div style={{ fontSize: '1.75rem', flexShrink: 0 }}>
              {notification.icon}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: '0.95rem',
                fontWeight: '700',
                color: textColors[notification.type],
                margin: '0 0 0.25rem 0',
              }}
            >
              {notification.title}
            </p>
            <p
              style={{
                fontSize: '0.875rem',
                color: textColors[notification.type],
                margin: 0,
                opacity: 0.85,
              }}
            >
              {notification.message}
            </p>
          </div>
          <button
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: textColors[notification.type],
              cursor: 'pointer',
              fontSize: '1.25rem',
              padding: 0,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
