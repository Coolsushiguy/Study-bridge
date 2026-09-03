import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { GraduationCap, CheckCircle2, Clock, TrendingUp } from "lucide-react";

export default function Onboarding() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [active, setActive] = useState(null);
  const [adaptive, setAdaptive] = useState(false);
  const [title, setTitle] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const needsCareer = (user?.grade_int || 0) >= 6;

  const deadline = user?.assessment_deadline ? new Date(user.assessment_deadline) : null;
  const pastDeadline = deadline ? new Date() >= deadline : false;
  const daysLeft = deadline ? Math.max(0, Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24))) : null;

  const skip = async () => {
    if (skipping || pastDeadline) return;
    setSkipping(true);
    try {
      await api.post("/assessments/skip");
      await refresh();
      toast.success("Skipped for now — finish within your 2-week window.");
      navigate("/dashboard");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setSkipping(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const done = user.assessments || {};
    const list = [
      { key: "english", title: "English", desc: "Adaptive leveling · 30 questions + book picks" },
      { key: "overall", title: "Overall", desc: "Adaptive · 50 questions, scored 50–1200" },
    ];
    if (needsCareer) list.push({ key: "career", title: "Career", desc: "Interest survey · 30 questions (grade 6+)" });
    setTests(list.map((t) => ({ ...t, done: !!done[t.key] })));
  }, [user, needsCareer]);

  const start = async (key) => {
    setBusy(true);
    try {
      const { data } = await api.post("/assessments/start", { test_type: key });
      setActive(key); setAdaptive(data.adaptive); setTitle(data.title);
      setSessionId(data.session_id); setQuestion(data.question); setSelected(null); setResult(null);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  const answer = async () => {
    if (selected == null || busy) return;
    setBusy(true);
    try {
      const { data } = await api.post("/assessments/answer", { session_id: sessionId, answer_index: selected });
      if (data.done) {
        setResult(data.result); setQuestion(null);
        await refresh();
        setTests((ts) => ts.map((t) => t.key === active ? { ...t, done: true } : t));
        if (data.onboarding_complete) toast.success("Onboarding complete! Curriculum locked in.");
        else toast.success("Assessment saved");
      } else {
        setQuestion(data.question); setSelected(null);
      }
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  const allDone = tests.length > 0 && tests.every((t) => t.done);

  // Test-taking view
  if (active && question && !result) {
    const last = question.number >= question.total;
    return (
      <div className="min-h-screen bg-sb-base flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-2xl sb-card rounded-3xl p-8 sm:p-10 sb-fade-up">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-[0.2em] text-sb-accent/60">{title}</span>
            <span className="text-sm text-orange-100 font-medium" data-testid="question-counter">{question.number} / {question.total}</span>
          </div>
          {adaptive && question.difficulty != null && (
            <div className="flex items-center gap-2 mb-4" data-testid="difficulty-indicator">
              <TrendingUp className="w-3.5 h-3.5 text-sb-accent" />
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <span key={lvl} className={`w-6 h-1.5 rounded-full ${lvl <= question.difficulty ? "bg-sb-accent" : "bg-sb-border"}`} />
                ))}
              </div>
              <span className="text-xs text-sb-accent ml-1 font-semibold">Difficulty {question.difficulty}/5</span>
            </div>
          )}
          <div className="h-1 bg-sb-border rounded-full mb-8 overflow-hidden">
            <div className="h-full bg-sb-accent transition-[width] duration-300" style={{ width: `${(question.number / question.total) * 100}%` }} />
          </div>
          <h2 className="font-display text-lg sm:text-xl text-white mb-6" data-testid="assess-question">{question.q}</h2>
          <div className="space-y-3">
            {question.options.map((opt, i) => (
              <button key={i} data-testid={`assess-option-${i}`} onClick={() => setSelected(i)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  selected === i ? "border-sb-accent bg-sb-accent/15 text-orange-50" : "border-sb-border text-orange-50/90 hover:border-sb-accent/50"
                }`}>{opt}</button>
            ))}
          </div>
          <div className="flex justify-end mt-8">
            <button data-testid={last ? "assess-submit" : "assess-next"} disabled={selected == null || busy} onClick={answer}
              className="bg-sb-accent text-sb-base px-6 py-2.5 rounded-full font-medium disabled:opacity-40 hover:bg-sb-accentHover transition-colors">
              {busy ? "…" : last ? "Finish" : "Next"}
            </button>
          </div>
          {adaptive && (
            <p className="text-center text-xs text-sb-accent/70 mt-5">Answer correctly and the questions get harder.</p>
          )}
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
          <div className="text-orange-50/70 text-sm space-y-1 mb-8" data-testid="assess-result">
            {result.scaled_score != null && <p>Score: <b className="text-sb-accent">{result.scaled_score}</b> / 1200</p>}
            {result.level_label && <p className="text-sb-accent font-medium">{result.level_label}</p>}
            {result.level && <p>Level: <b className="text-sb-accent">{result.level}</b></p>}
            {result.correct != null && <p className="text-xs text-orange-50/50">{result.correct} correct out of {result.total}</p>}
            {result.suggested_books && <p className="mt-2">Suggested reads: {result.suggested_books.join(", ")}</p>}
            {result.top_interests && <p>Top interests: <b className="text-sb-accent">{result.top_interests.join(", ")}</b></p>}
          </div>
          <button data-testid="result-continue" onClick={() => { setActive(null); setQuestion(null); setResult(null); }} className="bg-sb-accent text-sb-base px-6 py-3 rounded-full font-medium">Continue</button>
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
        {pastDeadline ? (
          <p className="text-sm text-red-300 mb-2 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Your 2-week grace period has ended — these are now required to continue.</p>
        ) : (
          <p className="text-orange-50/60 mb-2">Complete these in one sitting (a 20-min break is fine), or skip for now — you have {daysLeft != null ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : "a 2-week window"}.</p>
        )}
        <p className="text-xs text-sb-accent/50 mb-8 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> The English & Overall tests adapt — questions get harder as you answer correctly.</p>

        <div className="space-y-4">
          {tests.map((t) => (
            <div key={t.key} data-testid={`assess-card-${t.key}`} className="sb-card rounded-2xl p-6 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg text-orange-100 flex items-center gap-2">
                  {t.title} {t.done && <CheckCircle2 className="w-4 h-4 text-sb-yellow" />}
                </h3>
                <p className="text-sm text-orange-50/50 mt-0.5">{t.desc}</p>
              </div>
              <button data-testid={`start-${t.key}`} onClick={() => start(t.key)} disabled={busy}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors disabled:opacity-50 ${t.done ? "border border-sb-border text-sb-accent/70" : "bg-sb-accent text-sb-base hover:bg-sb-accentHover"}`}>
                {t.done ? "Retake" : "Start"}
              </button>
            </div>
          ))}
        </div>

        <button data-testid="onboarding-continue" onClick={() => navigate("/dashboard")} disabled={!allDone}
          className="w-full mt-8 bg-sb-accent text-sb-base py-3.5 rounded-full font-medium disabled:opacity-40">
          {allDone ? "Enter StudyBridge" : "Finish all assessments to continue"}
        </button>

        {!pastDeadline && !allDone && (
          <button data-testid="onboarding-skip" onClick={skip} disabled={skipping}
            className="w-full mt-3 border border-sb-border text-sb-accent/70 py-3 rounded-full font-medium hover:border-sb-accent hover:text-sb-accent transition-colors disabled:opacity-50">
            {skipping ? "…" : `Skip for now (finish within ${daysLeft != null ? daysLeft : 14} days)`}
          </button>
        )}
      </div>
    </div>
  );
}
