import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, ListChecks, Library, Trophy, CheckCircle2 } from "lucide-react";

export default function Chapter() {
  const { subjectKey, chapterKey } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("lessons");
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setData(null);
    api.get(`/subjects/${subjectKey}/chapters/${chapterKey}`)
      .then(({ data }) => { setData(data); setAnswers(new Array(data.content.exercises.length).fill(null)); })
      .catch((e) => toast.error(formatApiError(e.response?.data?.detail) || "Could not load chapter"));
  }, [subjectKey, chapterKey]);

  const submit = async () => {
    setSubmitting(true);
    try {
      const { data: r } = await api.post("/exercises/submit", {
        subject: subjectKey, chapter: chapterKey, answers: answers.map((a) => a ?? -1),
      });
      setResult(r);
      if (r.state === "mastery") toast.success("100% — Mastery! 🏆");
      else if (r.state === "pass") toast.success(`Passed with ${r.score}%`);
      else toast(`Scored ${r.score}% — try again to pass (80%)`);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSubmitting(false); }
  };

  if (!data) return (
    <div className="flex items-center gap-3 text-orange-50/60">
      <div className="w-6 h-6 rounded-full border-2 border-sb-border border-t-sb-accent animate-spin" />
      Generating chapter content with AI…
    </div>
  );

  const { content, subject, chapter } = data;
  const TABS = [
    { key: "lessons", label: "Lessons", icon: BookOpen },
    { key: "exercises", label: "Exercises", icon: ListChecks },
    { key: "glossary", label: "Glossary", icon: Library },
  ];

  return (
    <div className="space-y-8 pb-16">
      <Link to={`/learn/${subjectKey}`} className="inline-flex items-center gap-1.5 text-sm text-sb-accent/60 hover:text-sb-accent"><ArrowLeft className="w-4 h-4" /> {subject.name}</Link>
      <div className="sb-fade-up">
        <p className="text-xs uppercase tracking-[0.2em] text-sb-accent/50">{subject.name}</p>
        <h1 className="font-display text-3xl sm:text-4xl text-white mt-1">{chapter.title}</h1>
      </div>

      <div className="flex gap-2 border-b border-sb-border">
        {TABS.map((t) => (
          <button key={t.key} data-testid={`tab-${t.key}`} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 -mb-px transition-colors ${tab === t.key ? "border-sb-accent text-sb-accent" : "border-transparent text-orange-50/50 hover:text-orange-50"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "lessons" && (
        <div className="space-y-10 max-w-3xl">
          {content.lessons.map((l, i) => (
            <article key={i} className="sb-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <h2 className="font-display text-xl text-orange-100 mb-3">{i + 1}. {l.title}</h2>
              <p className="font-body text-lg leading-loose text-orange-50/85 whitespace-pre-wrap">{l.body}</p>
            </article>
          ))}
          <p className="text-xs text-sb-accent/40 border-t border-sb-border pt-6">© StudyBridge · AI-generated & reviewed content. No external links.</p>
        </div>
      )}

      {tab === "exercises" && (
        <div className="max-w-2xl space-y-6">
          {content.exercises.map((ex, qi) => (
            <div key={qi} className="sb-card rounded-2xl p-6">
              <p className="font-body text-orange-50 mb-4">{qi + 1}. {ex.question}</p>
              <div className="space-y-2.5">
                {ex.options.map((opt, oi) => {
                  const chosen = answers[qi] === oi;
                  const showAnswer = result != null;
                  const isCorrect = ex.answer_index === oi;
                  let cls = "border-sb-border text-orange-50/70 hover:border-sb-accent/50";
                  if (showAnswer && isCorrect) cls = "border-sb-yellow bg-sb-yellow/10 text-sb-yellow";
                  else if (showAnswer && chosen && !isCorrect) cls = "border-red-400/60 bg-red-500/10 text-red-300";
                  else if (chosen) cls = "border-sb-accent bg-sb-accent/15 text-orange-50";
                  return (
                    <button key={oi} data-testid={`ex-${qi}-opt-${oi}`} disabled={result != null}
                      onClick={() => { const n = [...answers]; n[qi] = oi; setAnswers(n); }}
                      className={`w-full text-left px-4 py-2.5 rounded-lg border transition-colors ${cls}`}>{opt}</button>
                  );
                })}
              </div>
              {result != null && ex.explanation && <p className="text-xs text-orange-50/50 mt-3">{ex.explanation}</p>}
            </div>
          ))}

          {result ? (
            <div className="sb-card rounded-2xl p-6 flex items-center gap-4 border-2 border-sb-accent/40 sb-glow">
              {result.state === "mastery" ? <Trophy className="w-8 h-8 text-sb-accent" /> : <CheckCircle2 className="w-8 h-8 text-sb-yellow" />}
              <div className="flex-1">
                <p className="font-display text-xl text-white">{result.score}%</p>
                <p className="text-sm text-orange-50/60">{result.correct}/{result.total} correct · Best {result.best_score}%</p>
              </div>
              <button data-testid="retry-exercise" onClick={() => { setResult(null); setAnswers(new Array(content.exercises.length).fill(null)); }}
                className="px-5 py-2.5 rounded-full border border-sb-border text-sb-accent text-sm hover:border-sb-accent">Retry</button>
            </div>
          ) : (
            <button data-testid="submit-exercise" disabled={submitting || answers.some((a) => a == null)} onClick={submit}
              className="w-full bg-sb-accent text-sb-base py-3.5 rounded-full font-medium disabled:opacity-40 hover:bg-sb-accentHover transition-colors">
              {submitting ? "Checking…" : "Submit answers"}
            </button>
          )}
        </div>
      )}

      {tab === "glossary" && (
        <div className="max-w-2xl grid sm:grid-cols-2 gap-4">
          {content.glossary.map((g, i) => (
            <div key={i} className="sb-card rounded-xl p-5">
              <p className="font-display text-sb-accent text-sm">{g.term}</p>
              <p className="text-sm text-orange-50/70 mt-1.5 leading-relaxed">{g.definition}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
