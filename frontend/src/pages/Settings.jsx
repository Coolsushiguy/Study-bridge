import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { ShieldCheck, MessageSquare } from "lucide-react";

const CONTROLS = [
  { key: "prohibit_chat", label: "Prohibit tutor chat", desc: "Blocks tutor messaging (unlocks at 10k users)." },
  { key: "hide_real_name", label: "Hide real name", desc: "Only the username is shown publicly." },
  { key: "restrict_usernames", label: "Restrict usernames", desc: "Limits who can view or search this username." },
  { key: "disable_contests", label: "Disable contests", desc: "Opts out of contests & programs entirely." },
];

export default function Settings() {
  const { user, refresh } = useAuth();
  const [controls, setControls] = useState(user?.parental_controls || {});
  const [saving, setSaving] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => { setControls(user?.parental_controls || {}); }, [user]);
  useEffect(() => { api.get("/feedback/eligible").then(({ data }) => setEligible(data.eligible)).catch(() => {}); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/parental-controls", {
        prohibit_chat: !!controls.prohibit_chat, hide_real_name: !!controls.hide_real_name,
        restrict_usernames: !!controls.restrict_usernames, disable_contests: !!controls.disable_contests,
      });
      await refresh();
      toast.success("Controls saved");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const sendFeedback = async () => {
    if (!rating) return toast.error("Pick a rating");
    try {
      await api.post("/feedback", { rating, comment });
      toast.success("Thanks for your feedback!");
      setEligible(false);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="sb-fade-up">
        <p className="text-xs tracking-[0.2em] uppercase text-sb-accent/60">Settings</p>
        <h1 className="font-display text-3xl text-white mt-2">Parental controls</h1>
        <p className="text-orange-50/60 mt-2">School-safe controls for this account.</p>
      </div>

      <div className="sb-card rounded-2xl divide-y divide-sb-border">
        {CONTROLS.map((c) => (
          <label key={c.key} className="flex items-center justify-between gap-4 p-5 cursor-pointer">
            <div>
              <p className="text-orange-100 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-sb-accent" /> {c.label}</p>
              <p className="text-xs text-orange-50/50 mt-1">{c.desc}</p>
            </div>
            <button type="button" data-testid={`control-${c.key}`} onClick={() => setControls((p) => ({ ...p, [c.key]: !p[c.key] }))}
              className={`w-12 h-6 rounded-full shrink-0 transition-colors relative ${controls[c.key] ? "bg-sb-accent" : "bg-sb-border"}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-[left] ${controls[c.key] ? "left-6" : "left-0.5"}`} />
            </button>
          </label>
        ))}
      </div>
      <button data-testid="save-controls" onClick={save} disabled={saving} className="bg-sb-accent text-sb-base px-6 py-3 rounded-full font-medium disabled:opacity-50">
        {saving ? "Saving…" : "Save controls"}
      </button>

      {eligible && (
        <div className="sb-card rounded-2xl p-6">
          <p className="text-orange-100 flex items-center gap-2 mb-3"><MessageSquare className="w-4 h-4 text-sb-accent" /> How's StudyBridge going?</p>
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} data-testid={`feedback-star-${n}`} onClick={() => setRating(n)}
                className={`w-10 h-10 rounded-lg border transition-colors ${rating >= n ? "bg-sb-accent text-sb-base border-sb-accent" : "border-sb-border text-sb-accent/50"}`}>{n}</button>
            ))}
          </div>
          <textarea data-testid="feedback-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
            placeholder="Anything you'd like us to know? (we ask again in 6 months)"
            className="w-full bg-sb-base border border-sb-border rounded-lg px-3 py-2.5 text-sm text-orange-50 focus:outline-none focus:ring-2 focus:ring-sb-accent" />
          <button data-testid="feedback-submit" onClick={sendFeedback} className="mt-3 bg-sb-accent text-sb-base px-5 py-2.5 rounded-full text-sm font-medium">Send feedback</button>
        </div>
      )}
    </div>
  );
}
