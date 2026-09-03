import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import {
  LayoutDashboard, BookOpen, Timer, Sparkles, Settings, LogOut,
  ChevronLeft, ChevronRight, Lock, GraduationCap, Bell,
} from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/learn", label: "Learn", icon: BookOpen },
  { to: "/settings", label: "Controls", icon: Settings },
];

const LOCKED = [
  { label: "Tutors", icon: GraduationCap },
  { label: "Contests", icon: Sparkles },
];

export default function Sidebar({ collapsed, setCollapsed, onOpenAi, onOpenFocus, onOpenNotifications }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    api.get("/notifications/unread-count").then(({ data }) => setHasUnread(data.count > 0)).catch(() => {});
  }, []);

  return (
    <aside
      data-testid="sidebar"
      className="fixed top-0 left-0 h-full z-30 bg-sb-surface border-r border-sb-border flex flex-col transition-[width] duration-300"
      style={{ width: collapsed ? 72 : 248 }}
    >
      <div className="h-16 flex items-center gap-3 px-5 border-b border-sb-border">
        <div className="w-8 h-8 rounded-lg bg-sb-accent flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-sb-base" />
        </div>
        {!collapsed && <span className="font-display text-sb-accent text-sm">StudyBridge</span>}
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            data-testid={`nav-${item.label.toLowerCase()}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-200 ${
                isActive ? "bg-sb-accent/15 text-sb-accent" : "text-sb-accent/60 hover:text-sb-accent hover:bg-sb-elevated"
              }`
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        <button
          data-testid="nav-focus"
          onClick={onOpenFocus}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sb-accent/60 hover:text-sb-accent hover:bg-sb-elevated transition-colors duration-200"
        >
          <Timer className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Focus Mode</span>}
        </button>
        <button
          data-testid="nav-ai-helper"
          onClick={onOpenAi}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sb-accent/60 hover:text-sb-accent hover:bg-sb-elevated transition-colors duration-200"
        >
          <Sparkles className="w-5 h-5 shrink-0" />
          {!collapsed && <span>AI Helper</span>}
        </button>
        <button
          data-testid="nav-notifications"
          onClick={() => { setHasUnread(false); onOpenNotifications && onOpenNotifications(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sb-accent/60 hover:text-sb-accent hover:bg-sb-elevated transition-colors duration-200 relative"
        >
          <span className="relative shrink-0">
            <Bell className="w-5 h-5" />
            {hasUnread && (
              <span data-testid="notification-dot" className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-sb-accent border-2 border-sb-surface" />
            )}
          </span>
          {!collapsed && <span>Notifications</span>}
        </button>

        {!collapsed && (
          <div className="pt-5 mt-4 border-t border-sb-border">
            <p className="px-3 text-[10px] tracking-[0.2em] uppercase text-sb-accent/40 mb-2">Unlocks at 10k</p>
            {LOCKED.map((l) => (
              <div key={l.label} className="flex items-center gap-3 px-3 py-2 text-sm text-sb-accent/25">
                <l.icon className="w-4 h-4" /> <span>{l.label}</span>
                <Lock className="w-3 h-3 ml-auto" />
              </div>
            ))}
          </div>
        )}
      </nav>

      <div className="p-3 border-t border-sb-border space-y-1">
        {!collapsed && user && (
          <div className="px-3 py-2 text-xs text-sb-accent/50 truncate">@{user.username} · Gr {user.grade}</div>
        )}
        <button
          data-testid="logout-btn"
          onClick={() => { logout(); navigate("/"); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sb-accent/60 hover:text-red-300 hover:bg-sb-elevated transition-colors duration-200"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>
        <button
          data-testid="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2 rounded-lg text-sb-accent/50 hover:text-sb-accent hover:bg-sb-elevated transition-colors duration-200"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  );
}
