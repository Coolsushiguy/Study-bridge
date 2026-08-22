import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, ShieldCheck } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Field } from "@/pages/Login";
import { toast } from "sonner";

const GRADES = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

export default function Signup() {
  const [tab, setTab] = useState("student"); // student | parent
  const [states, setStates] = useState([]);
  const [homeschool, setHomeschool] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ grade: "6", state: "" });
  const { loginWith } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { api.get("/meta/states").then(({ data }) => setStates(data.states)).catch(() => {}); }, []);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const gradeInt = form.grade === "K" ? 0 : parseInt(form.grade, 10);

  // K-5 must use parent path (unless homeschool self allowed for older homeschoolers)
  useEffect(() => { if (tab === "student" && gradeInt < 6 && !homeschool) setTab("parent"); }, [gradeInt, homeschool, tab]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let data;
      if (tab === "parent") {
        ({ data } = await api.post("/auth/register-parent", {
          parent_name: form.parent_name, email: form.email, password: form.password,
          child_username: form.username, child_grade: form.grade,
          school: form.school, state: form.state, district: form.district, homeschool,
        }));
        loginWith(data.token, data.user);
        toast.success("Account created — verify parental consent", {
          description: "Mock consent link opened below", duration: 12000,
        });
        if (data.consent_link) toast("Parental consent link (mock email)", { description: data.consent_link, duration: 15000 });
      } else {
        ({ data } = await api.post("/auth/register-student", {
          username: form.username, email: form.email, password: form.password, grade: form.grade,
          school: form.school, state: form.state, district: form.district,
          principal_email: form.principal_email, district_email: form.district_email,
          library_email: form.library_email, homeschool,
        }));
        loginWith(data.token, data.user);
        toast.success("Welcome to StudyBridge!");
      }
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

        <div className="flex gap-2 p-1 bg-sb-base rounded-full mb-6 border border-sb-border">
          {[["student", "Student (6th+)"], ["parent", "Parent (K–5)"]].map(([k, l]) => (
            <button key={k} data-testid={`tab-${k}`} onClick={() => setTab(k)}
              className={`flex-1 py-2 rounded-full text-sm transition-colors ${tab === k ? "bg-sb-accent text-sb-base" : "text-sb-accent/60"}`}>{l}</button>
          ))}
        </div>

        {tab === "parent" && (
          <div className="flex items-start gap-2 text-xs text-sb-accent/70 bg-sb-base border border-sb-border rounded-lg p-3 mb-5">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
            <span>COPPA: you'll confirm consent via an email link. No child email is stored; chat & contests stay off.</span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {tab === "parent" && <Field label="Parent full name" value={form.parent_name || ""} onChange={set("parent_name")} testId="signup-parent-name" required />}
          <Field label={tab === "parent" ? "Child username" : "Username"} value={form.username || ""} onChange={set("username")} testId="signup-username" required />
          <Field label={tab === "parent" ? "Parent email" : "Email"} type="email" value={form.email || ""} onChange={set("email")} testId="signup-email" required />
          <Field label="Password" type="password" value={form.password || ""} onChange={set("password")} testId="signup-password" required />

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs tracking-wide uppercase text-sb-accent/60">Grade</span>
              <select data-testid="signup-grade" value={form.grade} onChange={(e) => set("grade")(e.target.value)}
                className="mt-1.5 w-full bg-sb-base border border-sb-border rounded-lg px-3 py-2.5 text-orange-50 focus:outline-none focus:ring-2 focus:ring-sb-accent">
                {GRADES.map((g) => <option key={g} value={g}>{g === "K" ? "Kindergarten" : `Grade ${g}`}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs tracking-wide uppercase text-sb-accent/60">State</span>
              <select data-testid="signup-state" value={form.state} onChange={(e) => set("state")(e.target.value)}
                className="mt-1.5 w-full bg-sb-base border border-sb-border rounded-lg px-3 py-2.5 text-orange-50 focus:outline-none focus:ring-2 focus:ring-sb-accent">
                <option value="">Select…</option>
                {states.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <Field label="School" value={form.school || ""} onChange={set("school")} testId="signup-school" />
          <Field label="District" value={form.district || ""} onChange={set("district")} testId="signup-district" />

          {tab === "student" && (
            <details className="text-sm">
              <summary className="cursor-pointer text-sb-accent/60 hover:text-sb-accent">Optional certificate emails</summary>
              <div className="space-y-3 mt-3">
                <Field label="Principal email" type="email" value={form.principal_email || ""} onChange={set("principal_email")} testId="signup-principal" />
                <Field label="District email" type="email" value={form.district_email || ""} onChange={set("district_email")} testId="signup-district-email" />
                <Field label="Library email" type="email" value={form.library_email || ""} onChange={set("library_email")} testId="signup-library" />
              </div>
            </details>
          )}

          <label className="flex items-center gap-2 text-sm text-sb-accent/70 cursor-pointer">
            <input type="checkbox" data-testid="signup-homeschool" checked={homeschool} onChange={(e) => setHomeschool(e.target.checked)} className="accent-sb-accent w-4 h-4" />
            I'm a homeschooler
          </label>

          <button data-testid="signup-submit" disabled={loading} className="w-full bg-sb-accent text-sb-base py-3 rounded-full font-medium hover:bg-sb-accentHover transition-colors disabled:opacity-50">
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="text-center text-sm text-sb-accent/60 mt-5">
          Already have an account? <Link to="/login" className="text-sb-accent">Log in</Link>
        </p>
      </div>
    </div>
  );
}
