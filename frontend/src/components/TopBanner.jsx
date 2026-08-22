import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, GraduationCap } from "lucide-react";

export default function TopBanner() {
  const [visible, setVisible] = useState(true);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y <= 4) setVisible(true);
      else if (y > lastY) setVisible(false);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 h-3 z-50"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      />
      <div
        data-testid="top-banner"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md bg-sb-base/70 border-b border-sb-border transition-opacity duration-500"
        style={{ opacity: visible || hover ? 1 : 0, pointerEvents: visible || hover ? "auto" : "none" }}
      >
        <div className="max-w-7xl mx-auto px-6 h-11 flex items-center justify-between text-sm">
          <Link to="/dashboard" className="flex items-center gap-2 font-display text-sb-accent">
            <GraduationCap className="w-4 h-4" /> StudyBridge
          </Link>
          <div className="flex items-center gap-2 text-sb-accent/80 text-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="tracking-wide">COPPA-safe learning · non-profit</span>
          </div>
        </div>
      </div>
    </>
  );
}
