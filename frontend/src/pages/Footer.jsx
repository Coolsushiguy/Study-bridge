import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";

export default function Footer() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/stats").then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  return (
    <footer className="border-t border-sb-border py-10 mt-16">
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-sb-accent/50">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
          <span>&copy; StudyBridge Logo — Copyrighted. Made in September 2026.</span>
          <span className="hidden sm:inline">·</span>
          <span data-testid="footer-visit-counter">
            {stats ? stats.total_visits.toLocaleString() : "—"} total visits
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/about" className="hover:text-sb-accent transition-colors">About Us</Link>
          <a href="mailto:studybridge.contact@protonmail.com" className="hover:text-sb-accent transition-colors">
            studybridge.contact@protonmail.com
          </a>
          <a href="mailto:studybridge.cooperate@protonmail.com" className="hover:text-sb-accent transition-colors">
            studybridge.cooperate@protonmail.com
          </a>
          <Link to="/contact" className="hover:text-sb-accent transition-colors">Contact Us</Link>
        </div>
      </div>
    </footer>
  );
}
