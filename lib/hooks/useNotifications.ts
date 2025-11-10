import { useState } from "react";

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
    read: true,
    link: "/app/inventory",
  },
  {
    id: "4",
    type: "job",
    title: "New Job Assigned",
    message: "Corporate Conference - Event Center has been assigned to you",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    read: true,
    link: "/app/jobs",
  },
];

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return {
    notifications,
    markAsRead,
    markAllAsRead,
  };
}
