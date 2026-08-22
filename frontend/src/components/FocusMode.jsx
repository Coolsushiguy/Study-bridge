import { useState, useEffect } from "react";
import { X, Play, Pause, RotateCcw } from "lucide-react";

export default function FocusMode({ open, onClose }) {
  const [minutes, setMinutes] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => { if (!running) setRemaining(minutes * 60); }, [minutes, running]);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) { setRunning(false); return; }
    const t = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(t);
  }, [running, remaining]);

  if (!open) return null;

  const total = minutes * 60;
  const pct = total ? (remaining / total) : 0;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const R = 130;
  const circ = 2 * Math.PI * R;

  return (
    <div data-testid="focus-mode-overlay" className="fixed inset-0 z-[60] bg-sb-base flex flex-col items-center justify-center">
      <div className="absolute top-0 left-0 right-0 backdrop-blur-md bg-sb-base/70 border-b border-sb-border py-2.5 text-center text-xs text-sb-accent/70">
        Mobile blocking not supported — in-app focus only
      </div>
      <button data-testid="exit-focus" onClick={() => { setRunning(false); onClose(); }} className="absolute top-14 right-6 text-sb-accent/60 hover:text-sb-accent flex items-center gap-1 text-sm">
        <X className="w-5 h-5" /> Exit
      </button>

      <div className="relative w-[300px] h-[300px] flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" width="300" height="300">
          <circle cx="150" cy="150" r={R} fill="none" stroke="#5C1A1A" strokeWidth="6" />
          <circle cx="150" cy="150" r={R} fill="none" stroke="#FA8720" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
            style={{ filter: "drop-shadow(0 0 12px rgba(250,135,32,0.6))", transition: "stroke-dashoffset 1s linear" }} />
        </svg>
        <div className="text-center">
          <div data-testid="focus-timer" className="font-display text-6xl text-white tracking-tight">{mm}:{ss}</div>
          <div className="text-sb-accent/50 text-xs tracking-[0.3em] uppercase mt-2">Focus</div>
        </div>
      </div>

      {!running && (
        <div className="mt-10 flex items-center gap-3 flex-wrap justify-center">
          {[10, 25, 45, 60, 90, 120].map((m) => (
            <button key={m} data-testid={`focus-preset-${m}`} onClick={() => setMinutes(m)}
              className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                minutes === m ? "bg-sb-accent text-sb-base border-sb-accent" : "border-sb-border text-sb-accent/70 hover:border-sb-accent"
              }`}>{m}m</button>
          ))}
        </div>
      )}

      <div className="mt-8 flex items-center gap-4">
        <button data-testid="focus-toggle" onClick={() => setRunning((r) => !r)}
          className="w-14 h-14 rounded-full bg-sb-accent text-sb-base flex items-center justify-center hover:bg-sb-accentHover transition-colors sb-glow">
          {running ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
        </button>
        <button data-testid="focus-reset" onClick={() => { setRunning(false); setRemaining(minutes * 60); }}
          className="w-12 h-12 rounded-full border border-sb-border text-sb-accent/70 flex items-center justify-center hover:text-sb-accent">
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
