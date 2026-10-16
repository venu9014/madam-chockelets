"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, CheckCheck, AlertCircle, CheckCircle, Info, ExternalLink } from "lucide-react";
import clsx from "clsx";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: string;
  type: string;
  isRead: boolean;
  linkUrl: string | null;
  createdAt: string;
}

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await fetch("/api/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: item.id }),
        });
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
      } catch (err) {
        console.error("Error marking item as read:", err);
      }
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 rounded-lg text-cocoa hover:text-plum hover:bg-cream-muted transition-colors border border-transparent hover:border-gold-300 focus:outline-none"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5 text-cocoa" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-gold-600 rounded-full px-1 border-2 border-white shadow-sm animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-luxury-lg border border-gold-300/80 z-50 overflow-hidden animate-in fade-in-50 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-cream via-cream-muted to-cream border-b border-gold-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-plum text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-gold-500/20 text-gold-800 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-gold-700 hover:text-gold-900 font-medium flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-cream-muted">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutralMuted">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutralMuted">
                No active notifications at this time.
              </div>
            ) : (
              notifications.map((item) => {
                const ItemContent = (
                  <div
                    onClick={() => handleItemClick(item)}
                    className={clsx(
                      "p-3.5 transition-colors cursor-pointer hover:bg-cream/60 flex items-start gap-3",
                      !item.isRead ? "bg-gold-50/30" : "bg-white opacity-85"
                    )}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {item.type === "URGENT" ? (
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                      ) : item.type === "SUCCESS" ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Info className="w-4 h-4 text-gold-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={clsx("text-xs font-semibold truncate", !item.isRead ? "text-plum" : "text-neutralMuted")}>
                          {item.title}
                        </p>
                        <span className="text-[10px] text-neutralMuted flex-shrink-0">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-cocoa/80 line-clamp-2">
                        {item.message}
                      </p>
                    </div>
                  </div>
                );

                if (item.linkUrl) {
                  return (
                    <Link key={item.id} href={item.linkUrl}>
                      {ItemContent}
                    </Link>
                  );
                }

                return <div key={item.id}>{ItemContent}</div>;
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-cream-muted border-t border-gold-200/60 text-center">
            <span className="text-[11px] text-neutralMuted">
              Madam Chocolate Operational Queue
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
