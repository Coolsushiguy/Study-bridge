import { useEffect, useState, useRef } from "react";

/**
 * Circular progress indicator for long-running requests (like account
 * creation, which can take a while if the backend needs to "wake up" from
 * a cold start). Since we don't get real progress updates from the server,
 * this smoothly animates toward ~92% and holds there — then the caller
 * flips `done` to true once the real response arrives, which snaps it to 100%.
 */
export default function ProgressRing({ active, done, size = 64, label = "Creating…" }) {
  const [pct, setPct] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (!active) { setPct(0); startRef.current = null; return; }
    startRef.current = performance.now();
    const tick = (now) => {
      const elapsed = (now - startRef.current) / 1000; // seconds
      // Slows down as it approaches the cap — never quite finishes on its own.
      const cap = 92;
      const next = cap * (1 - Math.exp(-elapsed / 20));
      setPct(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  useEffect(() => {
    if (done) setPct(100);
  }, [done]);

  if (!active) return null;

  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct / 100);

  return (
    <div className="flex flex-col items-center gap-3 py-6" data-testid="progress-ring">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#3A3A3A" strokeWidth="6" />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#FA8720" strokeWidth="6"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.2s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-medium" style={{ color: "#FA8720" }}>
          {Math.round(pct)}%
        </div>
      </div>
      <p className="text-sm" style={{ color: "#666666" }}>{label}</p>
    </div>
  );
}
