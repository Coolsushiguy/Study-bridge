import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, ShieldCheck, Lock, Mail } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Field } from "@/pages/Login";
import { toast } from "sonner";

const GRADES = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

export default function Signup() {
  // Step "age": a single neutral question, no visible hint about what happens next.
  // Step "student": normal self-signup (age > 13).
  // Step "parent-email": under-13 path — just collect a parent email and send them the real invite.
  // Step "sent": confirmation the invite email went out.
  const [step, setStep] = useState("age");
  const [states, setStates] = useState([]);
  const [homeschool, setHomeschool] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ age: "", grade: "" });
  const [parentEmail, setParentEmail] = useState("");
  const [devLink, setDevLink] = useState(null);
  const { loginWith } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { api.get("/meta/states").then(({ data }) => setStates(data.states)).catch(() => {}); }, []);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const continueFromAge = (e) => {
    e.preventDefault();
    const age = parseInt(form.age, 10);
    if (!age || age < 3 || age > 100) return;
    setStep(age <= 13 ? "parent-email" : "student");
  };

  const sendParentInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/parent-invite", {
        child_age: parseInt(form.age, 10), parent_email: parentEmail,
      });
      setDevLink(data.dev_create_link || null);
      setStep("sent");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally { setLoading(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register-student", {
        username: form.username, email: form.email, password: form.password,
        grade: form.grade, age: parseInt(form.age, 10),
        school: form.school, state: form.state, district: form.district,
        principal_email: form.principal_email, district_email: form.district_email,
        library_email: form.library_email, homeschool,
      });
      loginWith(data.token, data.user);
      toast.success("Welcome to StudyBridge!");
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

        {step === "age" && (
          <form onSubmit={continueFromAge} className="space-y-5">
            <div className="text-center mb-2">
              <h1 className="font-display text-xl text-white mb-1">Let's get started</h1>
              <p className="text-sm text-orange-50/60">First, how old are you?</p>
            </div>
            <label className="block">
              <span className="text-xs tracking-wide uppercase text-sb-accent/60">Age</span>
              <input data-testid="signup-age" type="number" min="3" max="100" required value={form.age}
                onChange={(e) => set("age")(e.target.value)}
                className="mt-1.5 w-full bg-sb-base border border-sb-border rounded-lg px-3 py-2.5 text-orange-50 focus:outline-none focus:ring-2 focus:ring-sb-accent" />
            </label>
            <button data-testid="signup-age-continue" disabled={!form.age} className="w-full bg-sb-accent text-sb-base py-3 rounded-full font-medium hover:bg-sb-accentHover transition-colors disabled:opacity-40">
              Continue
            </button>
          </form>
        )}

        {step === "parent-email" && (
          <form onSubmit={sendParentInvite} className="space-y-5">
            <div className="flex items-start gap-2 text-xs text-sb-accent/70 bg-sb-base border border-sb-border rounded-lg p-3">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Since you're 13 or under, StudyBridge (by law, COPPA) needs a parent or guardian to create your account. Enter their email and we'll send them everything they need.</span>
            </div>
            <Field label="Parent or guardian's email" type="email" value={parentEmail} onChange={setParentEmail} testId="signup-parent-email" required />
            <button data-testid="send-parent-invite" disabled={loading || !parentEmail} className="w-full bg-sb-accent text-sb-base py-3 rounded-full font-medium hover:bg-sb-accentHover transition-colors disabled:opacity-50">
              {loading ? "Sending…" : "Send to my parent"}
            </button>
            <button type="button" onClick={() => setStep("age")} className="w-full text-center text-xs text-sb-accent/50 hover:text-sb-accent">← Back</button>
          </form>
        )}

        {step === "sent" && (
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 rounded-full bg-sb-accent/15 flex items-center justify-center mx-auto">
              <Mail className="w-7 h-7 text-sb-accent" />
            </div>
            <h2 className="font-display text-xl text-white">Check with your parent!</h2>
            <p className="text-sm text-orange-50/60">
              We sent an email to <span className="text-sb-accent">{parentEmail}</span> with a link to create your account. Ask them to check their inbox (and spam folder).
            </p>
            {devLink && (
              <div className="text-left bg-sb-base border border-sb-border rounded-lg p-3 text-xs text-sb-accent/60">
                Email sending isn't configured yet in this environment — here's the link that would've been emailed:
                <a href={devLink} className="block mt-1 text-sb-accent break-all">{devLink}</a>
              </div>
            )}
            <Link to="/" className="inline-block text-sm text-sb-accent hover:underline">Back to StudyBridge</Link>
          </div>
        )}

        {step === "student" && (
          <form onSubmit={submit} className="space-y-4">
            <div className="text-center mb-2">
              <h1 className="font-display text-xl text-white mb-1">Create your account</h1>
            </div>
            <Field label="Username" value={form.username || ""} onChange={set("username")} testId="signup-username" required />
            <Field label="Email" type="email" value={form.email || ""} onChange={set("email")} testId="signup-email" required />
            <Field label="Password" type="password" value={form.password || ""} onChange={set("password")} testId="signup-password" required />

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs tracking-wide uppercase text-sb-accent/60">Grade</span>
                <select data-testid="signup-grade" value={form.grade} onChange={(e) => set("grade")(e.target.value)} required
                  className="mt-1.5 w-full bg-sb-base border border-sb-border rounded-lg px-3 py-2.5 text-orange-50 focus:outline-none focus:ring-2 focus:ring-sb-accent">
                  <option value="" disabled>Select…</option>
                  {GRADES.map((g) => <option key={g} value={g}>{g === "K" ? "Kindergarten" : `Grade ${g}`}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs tracking-wide uppercase text-sb-accent/60">State</span>
                <select data-testid="signup-state" value={form.state || ""} onChange={(e) => set("state")(e.target.value)}
                  className="mt-1.5 w-full bg-sb-base border border-sb-border rounded-lg px-3 py-2.5 text-orange-50 focus:outline-none focus:ring-2 focus:ring-sb-accent">
                  <option value="">Select…</option>
                  {states.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <Field label="School" value={form.school || ""} onChange={set("school")} testId="signup-school" />
            <Field label="District" value={form.district || ""} onChange={set("district")} testId="signup-district" />

            <details className="text-sm">
              <summary className="cursor-pointer text-sb-accent/60 hover:text-sb-accent">Optional certificate emails</summary>
              <div className="space-y-3 mt-3">
                <Field label="Principal email" type="email" value={form.principal_email || ""} onChange={set("principal_email")} testId="signup-principal" />
                <Field label="District email" type="email" value={form.district_email || ""} onChange={set("district_email")} testId="signup-district-email" />
                <Field label="Library email" type="email" value={form.library_email || ""} onChange={set("library_email")} testId="signup-library" />
              </div>
            </details>

            <label className="flex items-center gap-2 text-sm text-sb-accent/70 cursor-pointer">
              <input type="checkbox" data-testid="signup-homeschool" checked={homeschool} onChange={(e) => setHomeschool(e.target.checked)} className="accent-sb-accent w-4 h-4" />
              I'm a homeschooler
            </label>

            <button data-testid="signup-submit" disabled={loading} className="w-full bg-sb-accent text-sb-base py-3 rounded-full font-medium hover:bg-sb-accentHover transition-colors disabled:opacity-50">
              {loading ? "Creating…" : "Create account"}
            </button>
            <button type="button" onClick={() => setStep("age")} className="w-full text-center text-xs text-sb-accent/50 hover:text-sb-accent">← Back</button>
          </form>
        )}

        <p className="text-center text-sm text-sb-accent/60 mt-5">
          Already have an account? <Link to="/login" className="text-sb-accent">Log in</Link>
        </p>
      </div>
    </div>
  );
}
