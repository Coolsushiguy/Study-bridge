import { useState, useEffect, useRef } from "react";
import TopBanner from "@/components/TopBanner";
import Sidebar from "@/components/Sidebar";
import AiHelper from "@/components/AiHelper";
import FocusMode from "@/components/FocusMode";
import Footer from "@/components/Footer";
import NotificationsPanel from "@/components/NotificationsPanel";
import api from "@/lib/api";

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const pinged = useRef(false);

  // Count one visit + update streak once per mount (signed-in users only —
  // this component only renders inside the authenticated Layout/Protected route).
  useEffect(() => {
    if (pinged.current) return;
    pinged.current = true;
    api.post("/visit").catch(() => {});
    api.post("/activity/ping").catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-sb-base flex flex-col">
      <TopBanner />
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        onOpenAi={() => setAiOpen(true)}
        onOpenFocus={() => setFocusOpen(true)}
        onOpenNotifications={() => setNotifOpen(true)}
      />
      <main className="flex-1 transition-[margin] duration-300 pt-16" style={{ marginLeft: collapsed ? 72 : 248 }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">{children}</div>
        <Footer />
      </main>
      <AiHelper open={aiOpen} onClose={() => setAiOpen(false)} />
      <FocusMode open={focusOpen} onClose={() => setFocusOpen(false)} />
      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}
