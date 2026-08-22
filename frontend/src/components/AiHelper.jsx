import { useState, useRef, useEffect } from "react";
import { X, Send, ImagePlus, Sparkles } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";

const THINKING = ["Analyzing", "Thinking", "Memorizing", "Refreshing"];

export default function AiHelper({ open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState("Thinking");
  const [sessionId] = useState(() => Math.random().toString(36).slice(2, 9));
  const scrollRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (!loading) return;
    let i = 0;
    const t = setInterval(() => { i = (i + 1) % THINKING.length; setThinking(THINKING[i]); }, 900);
    return () => clearInterval(t);
  }, [loading]);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(f);
  };

  const send = async () => {
    if ((!input.trim() && !image) || loading) return;
    const userMsg = { role: "user", text: input, image };
    setMessages((m) => [...m, userMsg]);
    const payloadImg = image;
    setInput(""); setImage(null); setLoading(true);
    try {
      const { data } = await api.post("/ai/helper", {
        message: userMsg.text, session_id: sessionId, image_base64: payloadImg,
      });
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Helper unavailable");
    } finally { setLoading(false); }
  };

  return (
    <div
      data-testid="ai-helper-panel"
      className="fixed top-0 right-0 h-full w-full sm:w-[400px] z-50 bg-sb-surface border-l border-sb-border flex flex-col transition-transform duration-300 shadow-2xl"
      style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
    >
      <div className="h-16 flex items-center justify-between px-5 border-b border-sb-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-sb-accent" />
          <div>
            <p className="font-display text-sm text-sb-accent">Study Buddy</p>
            <p className="text-[10px] text-sb-accent/40 tracking-wide">Discuss, don't just answer</p>
          </div>
        </div>
        <button data-testid="close-ai-helper" onClick={onClose} className="text-sb-accent/60 hover:text-sb-accent">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="text-center text-sb-accent/40 text-sm mt-10 px-6">
            Ask me about any topic! I'll help you <span className="text-sb-accent">think it through</span> — not just hand you answers.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              m.role === "user" ? "bg-sb-accent text-sb-base" : "bg-sb-elevated text-orange-50 border border-sb-border"
            }`}>
              {m.image && <img src={m.image} alt="upload" className="rounded-lg mb-2 max-h-40" />}
              <p className="whitespace-pre-wrap">{m.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sb-accent/70 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-sb-accent sb-pulse" />
            {thinking}…
          </div>
        )}
      </div>

      <div className="p-4 border-t border-sb-border">
        {image && (
          <div className="mb-2 flex items-center gap-2">
            <img src={image} alt="preview" className="h-12 rounded-md" />
            <button onClick={() => setImage(null)} className="text-xs text-red-300">remove</button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} data-testid="ai-image-input" />
          <button onClick={() => fileRef.current?.click()} className="p-2.5 rounded-lg bg-sb-elevated text-sb-accent/70 hover:text-sb-accent border border-sb-border">
            <ImagePlus className="w-5 h-5" />
          </button>
          <textarea
            data-testid="ai-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask a question…"
            className="flex-1 resize-none bg-sb-base border border-sb-border rounded-lg px-3 py-2.5 text-sm text-orange-50 focus:outline-none focus:ring-2 focus:ring-sb-accent max-h-24"
          />
          <button data-testid="ai-send" onClick={send} disabled={loading} className="p-2.5 rounded-lg bg-sb-accent text-sb-base disabled:opacity-40 hover:bg-sb-accentHover transition-colors">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
