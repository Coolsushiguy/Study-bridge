import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);
  const { loginWith } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      loginWith(data.token, data.user);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally { setLoading(false); }
  };

  const doForgot = async () => {
    if (!email) return toast.error("Enter your email first");
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      if (data.reset_link) toast.success("Reset link (mock): open it", { description: data.reset_link, duration: 10000 });
      else toast.success("If that email exists, a reset link was sent.");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sb-base sb-grain px-6">
      <div className="w-full max-w-md sb-card rounded-3xl p-10 sb-fade-up">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-lg bg-sb-accent flex items-center justify-center"><GraduationCap className="w-5 h-5 text-sb-base" /></div>
          <span className="font-display text-sb-accent">StudyBridge</span>
        </Link>
        <h1 className="font-display text-2xl text-white text-center mb-6">Welcome back</h1>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email" type="email" value={email} onChange={setEmail} testId="login-email" />
          <Field label="Password" type="password" value={password} onChange={setPassword} testId="login-password" />
          <button data-testid="login-submit" disabled={loading} className="w-full bg-sb-accent text-sb-base py-3 rounded-full font-medium hover:bg-sb-accentHover transition-colors disabled:opacity-50">
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>
        <div className="flex justify-between mt-5 text-sm">
          <button onClick={doForgot} className="text-sb-accent/60 hover:text-sb-accent">Forgot password?</button>
          <Link to="/signup" className="text-sb-accent/60 hover:text-sb-accent">Create account</Link>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, type = "text", value, onChange, testId, ...rest }) {
  return (
    <label className="block">
      <span className="text-xs tracking-wide uppercase text-sb-accent/60">{label}</span>
      <input
        data-testid={testId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full bg-sb-base border border-sb-border rounded-lg px-3.5 py-2.5 text-orange-50 focus:outline-none focus:ring-2 focus:ring-sb-accent"
        {...rest}
      />
    </label>
  );
}
