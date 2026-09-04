import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { GraduationCap, ShieldCheck, Lock } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Field } from "@/pages/Login";
import { toast } from "sonner";

const GRADES = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

export default function ParentCreate() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState(null);
  const [states, setStates] = useState([]);
  const [homeschool, setHomeschool] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ grade: "" });
  const { loginWith } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { api.get("/meta/states").then(({ data }) => setStates(data.states)).catch(() => {}); }, []);

  useEffect(() => {
    if (!token) { setError("Missing invite link."); return; }
    api.get(`/auth/parent-invite/${token}`)
      .then(({ data }) => setInvite(data))
      .catch((e) => setError(formatApiError(e.response?.data?.detail) || "This link is invalid or has expired."));
  }, [token]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/parent-create", {
        token,
        parent_name: form.parent_name,
        parent_password: form.parent_password,
        child_username: form.child_username,
        child_grade: form.grade,
        school: form.school, state: form.state, district: form.district,
        homeschool,
      });
      loginWith(data.token, data.user);
      toast.success("Account created!");
      navigate(data.user.needs_assessment ? "/onboarding" : "/dashboard");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sb-base sb-grain px-6 py-12">
      <div className="w-full max-w-lg sb-card rounded-3xl p-8 sm:p-10 sb-fade-up">
        <Link to="/" className="flex items-center gap-2 justify-center mb-6">
          <div className="w-9 h-9 rounded-lg bg-sb-accent flex items-center justify-center"><GraduationCap className="w-5 h-5 text-sb-base" /></div>
          <span className="font-display text-sb-accent">StudyBridge</span>
        </Link>

        {error && (
          <div className="text-center space-y-4 py-4">
            <p className="text-red-300 text-sm">{error}</p>
            <Link to="/signup" className="text-sb-accent text-sm hover:underline">Start a new signup</Link>
          </div>
        )}

        {!error && !invite && <p className="text-center text-sb-accent/60 text-sm py-8">Loading…</p>}

        {!error && invite && (
          <>
            <div className="flex items-start gap-2 text-xs text-sb-accent/70 bg-sb-base border border-sb-border rounded-lg p-3 mb-5">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              <span>You're creating a StudyBridge account for your child (age {invite.child_age}). The password you set below is also what you'll use to open Parental Controls later.</span>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <Field label="Your full name" value={form.parent_name || ""} onChange={set("parent_name")} testId="parentcreate-name" required />
              <div className="block">
                <span className="text-xs tracking-wide uppercase text-sb-accent/60">Your email</span>
                <div className="mt-1.5 w-full bg-sb-elevated border border-sb-border rounded-lg px-3 py-2.5 text-orange-50/70 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-sb-accent/40" /> {invite.parent_email}
                </div>
              </div>
              <Field label="Set a password" type="password" value={form.parent_password || ""} onChange={set("parent_password")} testId="parentcreate-password" required />
              <Field label="Child's username" value={form.child_username || ""} onChange={set("child_username")} testId="parentcreate-username" required />

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs tracking-wide uppercase text-sb-accent/60">Child's grade</span>
                  <select data-testid="parentcreate-grade" value={form.grade} onChange={(e) => set("grade")(e.target.value)} required
                    className="mt-1.5 w-full bg-sb-base border border-sb-border rounded-lg px-3 py-2.5 text-orange-50 focus:outline-none focus:ring-2 focus:ring-sb-accent">
                    <option value="" disabled>Select…</option>
                    {GRADES.map((g) => <option key={g} value={g}>{g === "K" ? "Kindergarten" : `Grade ${g}`}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs tracking-wide uppercase text-sb-accent/60">State</span>
                  <select data-testid="parentcreate-state" value={form.state || ""} onChange={(e) => set("state")(e.target.value)}
                    className="mt-1.5 w-full bg-sb-base border border-sb-border rounded-lg px-3 py-2.5 text-orange-50 focus:outline-none focus:ring-2 focus:ring-sb-accent">
                    <option value="">Select…</option>
                    {states.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              </div>
              <Field label="School" value={form.school || ""} onChange={set("school")} testId="parentcreate-school" />
              <Field label="District" value={form.district || ""} onChange={set("district")} testId="parentcreate-district" />

              <label className="flex items-center gap-2 text-sm text-sb-accent/70 cursor-pointer">
                <input type="checkbox" data-testid="parentcreate-homeschool" checked={homeschool} onChange={(e) => setHomeschool(e.target.checked)} className="accent-sb-accent w-4 h-4" />
                We homeschool
              </label>

              <button data-testid="parentcreate-submit" disabled={loading} className="w-full bg-sb-accent text-sb-base py-3 rounded-full font-medium hover:bg-sb-accentHover transition-colors disabled:opacity-50">
                {loading ? "Creating…" : "Create account"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
