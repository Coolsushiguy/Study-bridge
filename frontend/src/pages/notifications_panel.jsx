import { useEffect, useState } from "react";
import { X, Bell, CheckCheck } from "lucide-react";
import api from "@/lib/api";

export default function NotificationsPanel({ open, onClose, onRead }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get("/notifications")
      .then(({ data }) => setNotifications(data.notifications))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const markAllRead = async () => {
    try {
      await api.post("/notifications/read-all");
      setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
      onRead && onRead();
    } catch (e) {}
  };

  const markOneRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n)));
      onRead && onRead();
    } catch (e) {}
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end" data-testid="notifications-panel">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm h-full bg-sb-surface border-l border-sb-border flex flex-col sb-fade-up">
        <div className="h-16 flex items-center justify-between px-5 border-b border-sb-border shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-sb-accent" />
            <span className="font-display text-sb-accent text-sm">Notifications</span>
          </div>
          <button onClick={onClose} className="text-sb-accent/60 hover:text-sb-accent">
            <X className="w-5 h-5" />
          </button>
        </div>

        {notifications.some((n) => !n.read) && (
          <button onClick={markAllRead} className="flex items-center gap-1.5 text-xs text-sb-accent/70 hover:text-sb-accent px-5 py-3 border-b border-sb-border">
            <CheckCheck className="w-3.5 h-3.5" /> Mark all as read
          </button>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && <p className="text-sm text-sb-accent/50 text-center py-8">Loading…</p>}
          {!loading && notifications.length === 0 && (
            <p className="text-sm text-sb-accent/50 text-center py-8">You're all caught up.</p>
          )}
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.read && markOneRead(n.id)}
              data-testid={`notification-${n.id}`}
              className={`w-full text-left rounded-xl p-4 border transition-colors ${
                n.read ? "border-sb-border bg-sb-elevated/40 text-orange-50/50" : "border-sb-accent/40 bg-sb-accent/10 text-orange-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {!n.read && <span className="w-2 h-2 rounded-full bg-sb-accent shrink-0" />}
                <p className="font-medium text-sm">{n.title}</p>
              </div>
              <p className="text-xs mt-1 leading-relaxed opacity-80">{n.body}</p>
              <p className="text-[10px] mt-2 opacity-50">{new Date(n.created_at).toLocaleString()}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
