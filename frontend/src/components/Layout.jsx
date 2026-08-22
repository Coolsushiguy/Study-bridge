import { useState } from "react";
import TopBanner from "@/components/TopBanner";
import Sidebar from "@/components/Sidebar";
import AiHelper from "@/components/AiHelper";
import FocusMode from "@/components/FocusMode";

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);

  return (
    <div className="min-h-screen bg-sb-base">
      <TopBanner />
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        onOpenAi={() => setAiOpen(true)}
        onOpenFocus={() => setFocusOpen(true)}
      />
      <main className="transition-[margin] duration-300 pt-16" style={{ marginLeft: collapsed ? 72 : 248 }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">{children}</div>
      </main>
      <AiHelper open={aiOpen} onClose={() => setAiOpen(false)} />
      <FocusMode open={focusOpen} onClose={() => setFocusOpen(false)} />
    </div>
  );
}
