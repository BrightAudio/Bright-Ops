import { useState, useEffect } from "react";

export type NotificationType = "pull_sheet" | "job" | "inventory" | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

const initialNotifications: Notification[] = [];

// Load notifications from localStorage
const loadNotifications = (): Notification[] => {
  if (typeof window === 'undefined') return initialNotifications;
  
  const stored = localStorage.getItem('notifications');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      }));
    } catch (e) {
      return initialNotifications;
    }
  }
  return initialNotifications;
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(loadNotifications);

  // Persist notifications to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  const markAsRead = (id: string) => {
    setNotifications((prev) => 
      prev.filter((n) => n.id !== id) // Remove the notification when marked as read
    );
  };

  const markAllAsRead = () => {
    setNotifications([]); // Clear all notifications when marking all as read
  };

  const hasUnread = notifications.length > 0;

  return {
    notifications,
    markAsRead,
    markAllAsRead,
    hasUnread,
  };
}
