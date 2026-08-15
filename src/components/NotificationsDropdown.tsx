import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, Trash2, X, Info, CheckCircle2, AlertTriangle, AlertCircle, ExternalLink, Server, Settings, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: string;
  read: boolean;
  link?: string;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "System Services Online",
    message: "Docker engine and server management stack are running normally.",
    type: "success",
    timestamp: "Just now",
    read: false,
    link: "/"
  },
  {
    id: "notif-2",
    title: "Security & Access",
    message: "Ensure custom API keys and passwords are securely configured in Settings.",
    type: "warning",
    timestamp: "10m ago",
    read: false,
    link: "/account"
  },
  {
    id: "notif-3",
    title: "Welcome to JTG Panel",
    message: "Create high-performance game servers with one-click deployment.",
    type: "info",
    timestamp: "1h ago",
    read: true,
    link: "/servers/create"
  }
];

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem("jtg_notifications");
      return saved ? JSON.parse(saved) : DEFAULT_NOTIFICATIONS;
    } catch {
      return DEFAULT_NOTIFICATIONS;
    }
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem("jtg_notifications", JSON.stringify(notifications));
  }, [notifications]);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    markAsRead(notif.id);
    if (notif.link) {
      navigate(notif.link);
      setIsOpen(false);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    return true;
  });

  const getTypeIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-theme-500 shrink-0" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-theme-500 shrink-0" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-theme-400 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-theme-500 shrink-0" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className={`p-2 text-dim hover:text-white hover:bg-white/[0.05] rounded transition-all relative ${
          isOpen ? "bg-white/[0.05] text-white" : ""
        }`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-theme-600 border-2 border-ink"></span>
          </span>
        )}
      </button>

      {/* Notifications Panel Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-panel backdrop-blur-2xl border border-line shadow-2xl rounded overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-theme-600/20 text-theme-500 border border-theme-600/30">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-muted-foreground hover:text-theme-500 transition-colors flex items-center gap-1"
                  title="Mark all as read"
                >
                  <Check size={12} />
                  Mark read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-muted-foreground hover:text-theme-400 transition-colors p-1 rounded-md hover:bg-muted"
                  title="Clear all notifications"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center px-4 pt-2 pb-1 border-b border-border/40 gap-2 bg-muted/30">
            <button
              onClick={() => setFilter("all")}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                filter === "all"
                  ? "bg-theme-600/20 text-theme-300 border border-theme-600/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                filter === "unread"
                  ? "bg-theme-600/20 text-theme-300 border border-theme-600/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border/40 custom-scrollbar">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">No notifications found</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  {filter === "unread" ? "You have read all your alerts!" : "All caught up."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 transition-all cursor-pointer group hover:bg-muted/60 relative ${
                    !notif.read ? "bg-theme-600/[0.04]" : ""
                  }`}
                >
                  <div className="mt-0.5">{getTypeIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-semibold truncate ${!notif.read ? "text-foreground" : "text-muted-foreground"}`}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground/60 shrink-0">
                        {notif.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                    {notif.link && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-theme-500 mt-1.5 opacity-80 group-hover:opacity-100">
                        View details <ExternalLink size={10} />
                      </span>
                    )}
                  </div>

                  {/* Unread dot */}
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-theme-600 shrink-0 mt-1.5" />
                  )}

                  {/* Close/delete button */}
                  <button
                    onClick={(e) => deleteNotification(notif.id, e)}
                    className="absolute right-2 top-2 p-1 text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Dismiss"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
