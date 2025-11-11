"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/lib/hooks/useNotifications";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Link from "next/link";

import type { NotificationType } from "@/lib/hooks/useNotifications";

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "pull_sheet":
      return { icon: "fas fa-clipboard-list", color: "#137CFB" };
    case "job":
      return { icon: "fas fa-briefcase", color: "#10B981" };
    case "inventory":
      return { icon: "fas fa-box", color: "#F59E0B" };
    case "system":
      return { icon: "fas fa-bell", color: "#8B5CF6" };
    default:
      return { icon: "fas fa-info-circle", color: "#6B7280" };
  }
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filteredNotifications = notifications.filter((n) =>
    filter === "all" ? true : !n.read
  );


  const unreadCount = notifications.filter((n) => !n.read).length;

  const router = useRouter();
  return (
    <DashboardLayout>
      <main className="p-6 max-w-4xl mx-auto">
        <div className="mb-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-3 py-2 rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition mb-2"
          >
            <span className="mr-2">←</span> Back
          </button>
        </div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Notifications</h1>
            <p className="text-zinc-400 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-md transition ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-4 py-2 rounded-md transition ${
                filter === "unread"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              Unread ({unreadCount})
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition"
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {filteredNotifications.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
              <i className="fas fa-inbox text-4xl text-zinc-600 mb-4"></i>
              <p className="text-zinc-400">
                {filter === "unread" ? "No unread notifications" : "No notifications yet"}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const { icon, color } = getNotificationIcon(notification.type);

              return notification.link ? (
                <Link
                  key={notification.id}
                  href={notification.link}
                  onClick={() => markAsRead(notification.id)}
                  className={`block bg-zinc-900 border border-zinc-800 rounded-lg p-4 transition hover:border-zinc-700 cursor-pointer ${
                    !notification.read ? "border-l-4 border-l-blue-500" : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <i className={icon} style={{ color, fontSize: "1.125rem" }}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-white font-medium mb-1">
                            {notification.title}
                            {!notification.read && (
                              <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </h3>
                          <p className="text-zinc-400 text-sm">{notification.message}</p>
                          <p className="text-zinc-500 text-xs mt-2">
                            {formatTimestamp(notification.timestamp)}
                          </p>
                        </div>
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="text-xs text-zinc-400 hover:text-white transition"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ) : (
                <div
                  key={notification.id}
                  className={`bg-zinc-900 border border-zinc-800 rounded-lg p-4 ${
                    !notification.read ? "border-l-4 border-l-blue-500" : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <i className={icon} style={{ color, fontSize: "1.125rem" }}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-white font-medium mb-1">
                            {notification.title}
                            {!notification.read && (
                              <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </h3>
                          <p className="text-zinc-400 text-sm">{notification.message}</p>
                          <p className="text-zinc-500 text-xs mt-2">
                            {formatTimestamp(notification.timestamp)}
                          </p>
                        </div>
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="text-xs text-zinc-400 hover:text-white transition"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
