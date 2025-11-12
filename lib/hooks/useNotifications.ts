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

const initialNotifications: Notification[] = [
  {
    id: "1",
    type: "pull_sheet",
    title: "Pull Sheet Ready",
    message: "Pull sheet PS-1003 is ready for picking",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    read: false,
    link: "/app/warehouse",
  },
  {
    id: "2",
    type: "job",
    title: "Job Completed",
    message: "Bob Evans event has been marked as complete",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    read: false,
    link: "/app/jobs",
  },
  {
    id: "3",
    type: "inventory",
    title: "Low Stock Alert",
    message: "X32 Mixer inventory is running low (2 units remaining)",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    read: false,
    link: "/app/inventory",
  },
  {
    id: "4",
    type: "job",
    title: "New Job Assigned",
    message: "Corporate Conference - Event Center has been assigned to you",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    read: false,
    link: "/app/jobs",
  },
];

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
