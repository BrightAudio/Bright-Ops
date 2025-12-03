import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export type NotificationType = "job_assignment" | "pull_sheet" | "job_update" | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

// Fallback to localStorage for backwards compatibility
const loadLocalNotifications = (): Notification[] => {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem('notifications');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      }));
    } catch (e) {
      return [];
    }
  }
  return [];
};

export function useNotifications(employeeId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Load notifications from database OR localStorage
  useEffect(() => {
    async function loadNotifications() {
      // If no employeeId provided, fall back to localStorage
      if (!employeeId) {
        setNotifications(loadLocalNotifications());
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', employeeId)
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        const notifications: Notification[] = (data || []).map((n: any) => ({
          id: n.id,
          type: n.type as NotificationType,
          title: n.title,
          message: n.message,
          timestamp: new Date(n.created_at),
          read: n.read,
          link: n.link
        }));

        setNotifications(notifications);
      } catch (err) {
        console.error('Error loading notifications:', err);
        // Fall back to localStorage on error
        setNotifications(loadLocalNotifications());
      } finally {
        setLoading(false);
      }
    }

    loadNotifications();

    // Subscribe to real-time changes if employeeId is provided
    if (!employeeId) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${employeeId}`
        },
        (payload) => {
          const newNotification: Notification = {
            id: payload.new.id,
            type: payload.new.type as NotificationType,
            title: payload.new.title,
            message: payload.new.message,
            timestamp: new Date(payload.new.created_at),
            read: payload.new.read,
            link: payload.new.link
          };
          setNotifications((prev) => [newNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId]);

  // Persist to localStorage when not using database
  useEffect(() => {
    if (!employeeId && typeof window !== 'undefined') {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }
  }, [notifications, employeeId]);

  const markAsRead = async (id: string) => {
    // If using database
    if (employeeId) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', id);

        if (error) throw error;

        setNotifications((prev) => prev.filter((n) => n.id !== id));
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    } else {
      // Using localStorage
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const markAllAsRead = async () => {
    // If using database
    if (employeeId) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', employeeId)
          .eq('read', false);

        if (error) throw error;

        setNotifications([]);
      } catch (err) {
        console.error('Error marking all notifications as read:', err);
      }
    } else {
      // Using localStorage
      setNotifications([]);
    }
  };

  const hasUnread = notifications.length > 0;

  return {
    notifications,
    markAsRead,
    markAllAsRead,
    hasUnread,
    loading,
  };
}
