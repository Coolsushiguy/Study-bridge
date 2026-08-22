import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import api from "@/lib/api";

export default function Consent() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState("verifying");
  const [username, setUsername] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setStatus("error"); return; }
    api.get(`/parent/consent/verify?token=${token}`)
      .then(({ data }) => { setUsername(data.username); setStatus("done"); })
      .catch(() => setStatus("error"));
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-sb-base sb-grain px-6">
      <div className="w-full max-w-md sb-card rounded-3xl p-10 text-center sb-fade-up">
        <ShieldCheck className="w-10 h-10 text-sb-accent mx-auto mb-4" />
        {status === "verifying" && <p className="text-orange-50/70">Verifying parental consent…</p>}
        {status === "done" && (
          <>
            <CheckCircle2 className="w-12 h-12 text-sb-yellow mx-auto mb-3" />
            <h1 className="font-display text-xl text-white mb-2">Consent confirmed</h1>
            <p className="text-orange-50/70 text-sm mb-6">The account for <b className="text-sb-accent">@{username}</b> is now verified and COPPA-compliant.</p>
            <Link to="/dashboard" data-testid="consent-continue" className="inline-block bg-sb-accent text-sb-base px-6 py-3 rounded-full font-medium">Go to dashboard</Link>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h1 className="font-display text-xl text-white mb-2">Link invalid</h1>
            <p className="text-orange-50/70 text-sm mb-6">This consent link is invalid or already used.</p>
            <Link to="/login" className="text-sb-accent">Back to login</Link>
          </>
        )}
      </div>
    </div>
  );
}
