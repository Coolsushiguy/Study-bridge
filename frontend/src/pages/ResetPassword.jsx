import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { Field } from "@/pages/Login";
import { toast } from "sonner";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token: params.get("token"), password });
      toast.success("Password updated — please log in");
      navigate("/login");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sb-base sb-grain px-6">
      <div className="w-full max-w-md sb-card rounded-3xl p-10 sb-fade-up">
        <h1 className="font-display text-xl text-white text-center mb-6">Set a new password</h1>
        <form onSubmit={submit} className="space-y-4">
          <Field label="New password" type="password" value={password} onChange={setPassword} testId="reset-password" required />
          <button data-testid="reset-submit" disabled={loading} className="w-full bg-sb-accent text-sb-base py-3 rounded-full font-medium disabled:opacity-50">
            {loading ? "Saving…" : "Update password"}
          </button>
        </form>
        <p className="text-center text-sm text-sb-accent/60 mt-5"><Link to="/login" className="text-sb-accent">Back to login</Link></p>
      </div>
    </div>
  );
}
