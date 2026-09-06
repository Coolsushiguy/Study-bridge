import { useState, useEffect } from "react";
import { Search, ShieldAlert, ShieldCheck, Clock, Flag } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";

export default function Admin() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [reports, setReports] = useState([]);
  const [tab, setTab] = useState("users"); // users | reports

  const search = async (e) => {
    e?.preventDefault();
    if (q.trim().length < 2) return;
    setSearching(true);
    try {
      const { data } = await api.get("/admin/users/search", { params: { q: q.trim() } });
      setResults(data.users);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally { setSearching(false); }
  };

  const loadReports = async () => {
    try {
      const { data } = await api.get("/admin/tutors/reports");
      setReports(data.reports);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  useEffect(() => { if (tab === "reports") loadReports(); }, [tab]);

  const act = async (path, successMsg) => {
    try {
      await api.post(path);
      toast.success(successMsg);
      search();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const ban = async (id) => {
    const reason = window.prompt("Ban reason (shown to the user):");
    if (reason == null) return;
    try {
      await api.post(`/admin/users/${id}/ban`, { reason });
      toast.success("User banned");
      search();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const suspend = async (id) => {
    const reason = window.prompt("Suspend reason (shown to the user):");
    if (reason == null) return;
    const daysStr = window.prompt("Suspend for how many days?", "7");
    if (daysStr == null) return;
    try {
      await api.post(`/admin/users/${id}/suspend`, { reason, days: parseInt(daysStr, 10) || 7 });
      toast.success("User suspended");
      search();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs tracking-[0.2em] uppercase text-sb-accent/60">Admin</p>
        <h1 className="font-display text-3xl text-white mt-2">User moderation</h1>
      </div>

      <div className="flex gap-2 p-1 bg-sb-surface rounded-full border border-sb-border w-fit">
        {[["users", "Search users"], ["reports", "Tutor reports"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${tab === k ? "bg-sb-accent text-sb-base" : "text-sb-accent/60"}`}>{l}</button>
        ))}
      </div>

      {tab === "users" && (
        <>
          <form onSubmit={search} className="flex gap-2 max-w-md">
            <input
              data-testid="admin-search-input"
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search by username…"
              className="flex-1 bg-sb-surface border border-sb-border rounded-lg px-3.5 py-2.5 text-orange-50 focus:outline-none focus:ring-2 focus:ring-sb-accent"
            />
            <button data-testid="admin-search-btn" disabled={searching} className="px-4 bg-sb-accent text-sb-base rounded-lg flex items-center gap-2 disabled:opacity-50">
              <Search className="w-4 h-4" /> {searching ? "…" : "Search"}
            </button>
          </form>

          <div className="space-y-3">
            {results.map((u) => (
              <div key={u.id} data-testid={`admin-user-${u.username}`} className="sb-card rounded-xl p-5 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-display text-orange-100 flex items-center gap-2">
                    {u.username}
                    {u.is_tutor && <span className="text-[10px] uppercase tracking-wide text-sb-accent bg-sb-accent/15 px-2 py-0.5 rounded-full">Tutor</span>}
                    {u.role === "admin" && <span className="text-[10px] uppercase tracking-wide text-sb-yellow bg-sb-yellow/15 px-2 py-0.5 rounded-full">Admin</span>}
                  </p>
                  <p className="text-xs text-orange-50/50 mt-0.5">{u.email} · Grade {u.grade}</p>
                  {u.banned && <p className="text-xs text-red-300 mt-1 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> Banned — {u.ban_reason}</p>}
                  {!u.banned && u.suspended_until && new Date(u.suspended_until) > new Date() && (
                    <p className="text-xs text-amber-300 mt-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Suspended until {new Date(u.suspended_until).toLocaleDateString()} — {u.suspend_reason}</p>
                  )}
                </div>
                {u.role !== "admin" && (
                  <div className="flex gap-2">
                    {u.banned ? (
                      <button data-testid={`unban-${u.username}`} onClick={() => act(`/admin/users/${u.id}/unban`, "Unbanned")} className="px-3 py-1.5 rounded-full text-xs border border-sb-border text-sb-accent/70 hover:text-sb-accent">Unban</button>
                    ) : (
                      <button data-testid={`ban-${u.username}`} onClick={() => ban(u.id)} className="px-3 py-1.5 rounded-full text-xs bg-red-500/15 text-red-300 hover:bg-red-500/25">Ban</button>
                    )}
                    {u.suspended_until && new Date(u.suspended_until) > new Date() ? (
                      <button data-testid={`unsuspend-${u.username}`} onClick={() => act(`/admin/users/${u.id}/unsuspend`, "Unsuspended")} className="px-3 py-1.5 rounded-full text-xs border border-sb-border text-sb-accent/70 hover:text-sb-accent">Unsuspend</button>
                    ) : (
                      <button data-testid={`suspend-${u.username}`} onClick={() => suspend(u.id)} className="px-3 py-1.5 rounded-full text-xs bg-amber-500/15 text-amber-300 hover:bg-amber-500/25">Suspend</button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {!searching && q.length >= 2 && results.length === 0 && (
              <p className="text-sm text-orange-50/50">No users found for "{q}".</p>
            )}
          </div>
        </>
      )}

      {tab === "reports" && (
        <div className="space-y-3">
          {reports.length === 0 && <p className="text-sm text-orange-50/50">No tutor reports yet.</p>}
          {reports.map((r) => (
            <div key={r.id} className="sb-card rounded-xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="font-display text-orange-100 flex items-center gap-2">
                  <Flag className="w-4 h-4 text-sb-accent" /> {r.tutor_username}
                  {r.ai_valid ? (
                    <span className="text-[10px] uppercase tracking-wide text-red-300 bg-red-500/15 px-2 py-0.5 rounded-full">AI: likely valid</span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wide text-orange-50/50 bg-white/5 px-2 py-0.5 rounded-full">AI: low confidence</span>
                  )}
                </p>
                <span className="text-[10px] text-orange-50/40">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-orange-50/70 mt-2"><span className="text-sb-accent/60">Reason:</span> {r.reason}</p>
              <p className="text-sm text-orange-50/70 mt-1">{r.details}</p>
              {r.ai_reasoning && <p className="text-xs text-orange-50/40 mt-2 italic">AI: {r.ai_reasoning}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
