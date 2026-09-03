import { useState, useEffect, useRef } from "react";
import { X, Play, Pause, RotateCcw, Music, Volume2, VolumeX } from "lucide-react";

// ---------------------------------------------------------------------------
// Lofi engine: fully synthesized in-browser with the Web Audio API.
// No external audio files are loaded, so there's no licensing/hotlinking risk
// and it works offline. It's a soft looping chord pad + gentle vinyl crackle
// + a mellow hi-hat tick, mixed low so it sits under focus/study sessions.
// ---------------------------------------------------------------------------
function useLofiEngine() {
  const ctxRef = useRef(null);
  const masterGainRef = useRef(null);
  const nodesRef = useRef([]);
  const timersRef = useRef([]);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.35);

  const stopAll = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    nodesRef.current.forEach((n) => { try { n.stop && n.stop(); n.disconnect && n.disconnect(); } catch (e) {} });
    nodesRef.current = [];
  };

  const start = () => {
    if (playing) return;
    const ctx = ctxRef.current || new (window.AudioContext || window.webkitAudioContext)();
    ctxRef.current = ctx;
    if (ctx.state === "suspended") ctx.resume();

    const master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    masterGainRef.current = master;

    // Warm lowpass on everything for that "lofi" muffled cassette feel
    const warmth = ctx.createBiquadFilter();
    warmth.type = "lowpass";
    warmth.frequency.value = 2200;
    warmth.connect(master);

    // Soft chord pad: a slow-moving ii-V-I-ish loop of mellow triads
    const chords = [
      [220.0, 261.63, 329.63],   // A minor-ish
      [196.0, 246.94, 293.66],   // G major-ish
      [174.61, 220.0, 261.63],   // F major-ish
      [196.0, 246.94, 311.13],   // G7-ish
    ];
    let chordIdx = 0;
    const playChord = () => {
      const now = ctx.currentTime;
      chords[chordIdx % chords.length].forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.06, now + 1.5);
        g.gain.linearRampToValueAtTime(0.0, now + 4.5);
        osc.connect(g).connect(warmth);
        osc.start(now);
        osc.stop(now + 4.6);
        nodesRef.current.push(osc);
      });
      chordIdx += 1;
      timersRef.current.push(setTimeout(playChord, 4000));
    };
    playChord();

    // Vinyl crackle: filtered white noise, very quiet, always on
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (Math.random() < 0.02 ? 1 : 0.05);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const crackleFilter = ctx.createBiquadFilter();
    crackleFilter.type = "highpass";
    crackleFilter.frequency.value = 1000;
    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0.02;
    noise.connect(crackleFilter).connect(crackleGain).connect(master);
    noise.start();
    nodesRef.current.push(noise);

    // Mellow hi-hat tick every ~500ms
    const playHat = () => {
      const now = ctx.currentTime;
      const hatBuf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const hd = hatBuf.getChannelData(0);
      for (let i = 0; i < hd.length; i++) hd[i] = (Math.random() * 2 - 1) * (1 - i / hd.length);
      const hat = ctx.createBufferSource();
      hat.buffer = hatBuf;
      const hatFilter = ctx.createBiquadFilter();
      hatFilter.type = "highpass";
      hatFilter.frequency.value = 6000;
      const hatGain = ctx.createGain();
      hatGain.gain.value = 0.025;
      hat.connect(hatFilter).connect(hatGain).connect(master);
      hat.start(now);
      nodesRef.current.push(hat);
      timersRef.current.push(setTimeout(playHat, 500));
    };
    playHat();

    setPlaying(true);
  };

  const stop = () => {
    stopAll();
    setPlaying(false);
  };

  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.value = volume;
  }, [volume]);

  useEffect(() => () => stopAll(), []);

  return { playing, start, stop, volume, setVolume };
}

export default function FocusMode({ open, onClose }) {
  const [minutes, setMinutes] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const lofi = useLofiEngine();

  useEffect(() => { if (!open) lofi.stop(); }, [open]); // eslint-disable-line

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
          <circle cx="150" cy="150" r={R} fill="none" stroke="#3A3A3A" strokeWidth="6" />
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

      <div className="mt-8 flex items-center gap-3 bg-sb-surface border border-sb-border rounded-full px-4 py-2">
        <button
          data-testid="lofi-toggle"
          onClick={() => (lofi.playing ? lofi.stop() : lofi.start())}
          className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full transition-colors ${
            lofi.playing ? "bg-sb-accent text-sb-base" : "text-sb-accent/70 hover:text-sb-accent"
          }`}
        >
          <Music className="w-4 h-4" /> {lofi.playing ? "Lofi Playing" : "Play Lofi"}
        </button>
        {lofi.playing && (
          <div className="flex items-center gap-2">
            {lofi.volume > 0 ? <Volume2 className="w-4 h-4 text-sb-accent/60" /> : <VolumeX className="w-4 h-4 text-sb-accent/60" />}
            <input
              data-testid="lofi-volume"
              type="range" min="0" max="1" step="0.05"
              value={lofi.volume}
              onChange={(e) => lofi.setVolume(parseFloat(e.target.value))}
              className="w-20 accent-sb-accent"
            />
          </div>
        )}
      </div>
    </div>
  );
}
