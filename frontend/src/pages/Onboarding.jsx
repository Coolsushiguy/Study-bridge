import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { GraduationCap, CheckCircle2, Clock } from "lucide-react";

export default function Onboarding() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [active, setActive] = useState(null);
  const [current, setCurrent] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState(null);

  const needsCareer = (user?.grade_int || 0) >= 6;

  useEffect(() => {
    if (!user) return;
    const done = user.assessments || {};
    const list = [
      { key: "english", title: "English", desc: "Leveling + 5 book picks" },
      { key: "overall", title: "Overall", desc: "Maps you to a grade (100–1000)" },
    ];
    if (needsCareer) list.push({ key: "career", title: "Career", desc: "Interests (grade 6+)" });
    setTests(list.map((t) => ({ ...t, done: !!done[t.key] })));
  }, [user, needsCareer]);

  const start = async (key) => {
    try {
      const { data } = await api.get(`/assessments/${key}`);
      setCurrent(data); setActive(key); setAnswers(new Array(data.questions.length).fill(null)); setIdx(0); setResult(null);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const pick = (optIdx) => {
    const next = [...answers]; next[idx] = optIdx; setAnswers(next);
  };

  const submit = async () => {
    try {
      const { data } = await api.post("/assessments/submit", { test_type: active, answers: answers.map((a) => a ?? 0) });
      setResult(data.result);
      await refresh();
      const done = { ...(user.assessments || {}), [active]: true };
      const required = ["english", "overall", ...(needsCareer ? ["career"] : [])];
      setTests((ts) => ts.map((t) => t.key === active ? { ...t, done: true } : t));
      if (data.onboarding_complete) toast.success("Onboarding complete! Curriculum locked in.");
      else toast.success("Assessment saved");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const allDone = tests.length > 0 && tests.every((t) => t.done);

  // Test-taking view
  if (active && current && !result) {
    const q = current.questions[idx];
    const answered = answers[idx] != null;
    const last = idx === current.questions.length - 1;
    return (
      <div className="min-h-screen bg-sb-base flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-2xl sb-card rounded-3xl p-8 sm:p-10 sb-fade-up">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs uppercase tracking-[0.2em] text-sb-accent/60">{current.title}</span>
            <span className="text-xs text-sb-accent/50">{idx + 1} / {current.questions.length}</span>
          </div>
          <div className="h-1 bg-sb-border rounded-full mb-8 overflow-hidden">
            <div className="h-full bg-sb-accent transition-[width] duration-300" style={{ width: `${((idx + 1) / current.questions.length) * 100}%` }} />
          </div>
          <h2 className="font-display text-lg sm:text-xl text-white mb-6">{q.q}</h2>
          <div className="space-y-3">
            {q.options.map((opt, i) => (
              <button key={i} data-testid={`assess-option-${i}`} onClick={() => pick(i)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  answers[idx] === i ? "border-sb-accent bg-sb-accent/15 text-orange-50" : "border-sb-border text-orange-50/70 hover:border-sb-accent/50"
                }`}>{opt}</button>
            ))}
          </div>
          <div className="flex justify-between mt-8">
            <button disabled={idx === 0} onClick={() => setIdx(idx - 1)} className="text-sb-accent/60 disabled:opacity-30">Back</button>
            {last ? (
              <button data-testid="assess-submit" disabled={!answered} onClick={submit} className="bg-sb-accent text-sb-base px-6 py-2.5 rounded-full font-medium disabled:opacity-40">Submit</button>
            ) : (
              <button data-testid="assess-next" disabled={!answered} onClick={() => setIdx(idx + 1)} className="bg-sb-accent text-sb-base px-6 py-2.5 rounded-full font-medium disabled:opacity-40">Next</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Result view
  if (result) {
    return (
      <div className="min-h-screen bg-sb-base flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-lg sb-card rounded-3xl p-10 text-center sb-fade-up">
          <CheckCircle2 className="w-12 h-12 text-sb-yellow mx-auto mb-4" />
          <h2 className="font-display text-xl text-white mb-4">Nice work!</h2>
          <div className="text-orange-50/70 text-sm space-y-1 mb-8">
            {result.scaled_score != null && <p>Score: <b className="text-sb-accent">{result.scaled_score}</b> · Mapped grade {result.mapped_grade}</p>}
            {result.level && <p>Level: <b className="text-sb-accent">{result.level}</b></p>}
            {result.suggested_books && <p className="mt-2">Suggested reads: {result.suggested_books.join(", ")}</p>}
            {result.top_interests && <p>Top interests: <b className="text-sb-accent">{result.top_interests.join(", ")}</b></p>}
          </div>
          <button onClick={() => { setActive(null); setCurrent(null); setResult(null); }} className="bg-sb-accent text-sb-base px-6 py-3 rounded-full font-medium">Continue</button>
        </div>
      </div>
    );
  }

  // Overview
  return (
    <div className="min-h-screen bg-sb-base sb-grain px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-2"><GraduationCap className="w-5 h-5 text-sb-accent" /><span className="font-display text-sb-accent">StudyBridge</span></div>
        <h1 className="font-display text-3xl text-white mb-3">Let's get you set up</h1>
        <p className="text-orange-50/60 mb-2">Complete these in one sitting (a 20-min break is fine). You have a 2-week window.</p>
        <p className="text-xs text-sb-accent/50 mb-8 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Curriculum adjusts toward your weaker subjects after the Overall test.</p>

        <div className="space-y-4">
          {tests.map((t) => (
            <div key={t.key} data-testid={`assess-card-${t.key}`} className="sb-card rounded-2xl p-6 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg text-orange-100 flex items-center gap-2">
                  {t.title} {t.done && <CheckCircle2 className="w-4 h-4 text-sb-yellow" />}
                </h3>
                <p className="text-sm text-orange-50/50 mt-0.5">{t.desc}</p>
              </div>
              <button data-testid={`start-${t.key}`} onClick={() => start(t.key)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${t.done ? "border border-sb-border text-sb-accent/70" : "bg-sb-accent text-sb-base hover:bg-sb-accentHover"}`}>
                {t.done ? "Retake" : "Start"}
              </button>
            </div>
          ))}
        </div>

        <button data-testid="onboarding-continue" onClick={() => navigate("/dashboard")} disabled={!allDone}
          className="w-full mt-8 bg-sb-accent text-sb-base py-3.5 rounded-full font-medium disabled:opacity-40">
          {allDone ? "Enter StudyBridge" : "Finish all assessments to continue"}
        </button>
      </div>
    </div>
  );
}
