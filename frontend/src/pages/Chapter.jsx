import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, ListChecks, Library, Trophy, CheckCircle2, Play, FlaskConical, X } from "lucide-react";

export default function Chapter() {
  const { subjectKey, chapterKey } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("lessons");
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null);
  const [watched, setWatched] = useState([]);
  const [labDone, setLabDone] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    setData(null);
    api.get(`/subjects/${subjectKey}/chapters/${chapterKey}`)
      .then(({ data }) => { setData(data); setAnswers(new Array(data.content.exercises.length).fill(null)); setWatched(data.progress?.watched_videos || []); setLabDone(!!data.progress?.lab_done); setCompleted(!!data.progress?.completed); })
      .catch((e) => toast.error(formatApiError(e.response?.data?.detail) || "Could not load chapter"));
  }, [subjectKey, chapterKey]);

  useEffect(() => {
    if (!data || completed) return;
    const best = result?.best_score ?? data.progress?.best_score ?? 0;
    const passed = best >= 80;
    const allWatched = data.content.videos.length > 0 && watched.length >= data.content.videos.length;
    const labOk = !data.content.lab || labDone;
    if (passed && allWatched && labOk) {
      setCompleted(true); setJustCompleted(true);
      api.post("/chapters/complete", { subject: subjectKey, chapter: chapterKey }).catch(() => {});
      toast.success("Chapter complete! 🎉");
    }
  }, [data, watched, labDone, result, completed, subjectKey, chapterKey]);

  const onLabComplete = () => {
    if (labDone) return;
    setLabDone(true);
    api.post("/labs/complete", { subject: subjectKey, chapter: chapterKey }).catch(() => {});
  };

  const openVideo = async (v, i) => {
    setActiveVideo(v);
    if (!watched.includes(i)) {
      setWatched((w) => [...w, i]);
      try {
        const { data } = await api.post("/videos/watched", { subject: subjectKey, chapter: chapterKey, video_index: i });
        setWatched(data.watched_videos);
      } catch { /* non-blocking */ }
    }
  };

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
    { key: "videos", label: "Videos", icon: Play },
    { key: "exercises", label: "Exercises", icon: ListChecks },
    { key: "glossary", label: "Glossary", icon: Library },
  ];
  if (content.lab) TABS.push({ key: "labs", label: "Lab", icon: FlaskConical });

  return (
    <div className="space-y-8 pb-16">
      <Link to={`/learn/${subjectKey}`} className="inline-flex items-center gap-1.5 text-sm text-sb-accent/60 hover:text-sb-accent"><ArrowLeft className="w-4 h-4" /> {subject.name}</Link>
      <div className="sb-fade-up">
        <p className="text-xs uppercase tracking-[0.2em] text-sb-accent/50">{subject.name}</p>
        <h1 className="font-display text-3xl sm:text-4xl text-white mt-1">{chapter.title}</h1>
      </div>

      {(() => {
        const best = result?.best_score ?? data.progress?.best_score ?? 0;
        const items = [
          { label: "Exercises passed (80%+)", done: best >= 80 },
          { label: `Videos watched (${watched.length}/${content.videos.length})`, done: content.videos.length > 0 && watched.length >= content.videos.length },
        ];
        if (content.lab) items.push({ label: "Lab completed", done: labDone });
        return (
          <div data-testid="completion-panel" className={`sb-card rounded-2xl p-5 sm:p-6 border-2 ${completed ? "border-sb-accent/50 sb-glow" : "border-sb-border"} ${justCompleted ? "sb-fade-up" : ""}`}>
            <div className="flex items-center gap-2 mb-3">
              {completed ? <Trophy className="w-5 h-5 text-sb-accent" /> : <ListChecks className="w-5 h-5 text-sb-accent/70" />}
              <p data-testid="completion-status" className="font-display text-sm text-orange-100">
                {completed ? "Chapter complete!" : "Finish this chapter"}
              </p>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {items.map((it, i) => (
                <span key={i} className={`flex items-center gap-1.5 text-sm ${it.done ? "text-sb-yellow" : "text-orange-50/50"}`}>
                  <CheckCircle2 className={`w-4 h-4 ${it.done ? "text-sb-yellow" : "text-orange-50/25"}`} /> {it.label}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

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

      {tab === "videos" && (
        <div className="space-y-6">
          {activeVideo && (
            <div className="sb-card rounded-2xl p-4 sb-fade-up">
              <div className="flex items-center justify-between mb-3">
                <p className="font-display text-orange-100 text-sm">{activeVideo.title}</p>
                <button data-testid="close-video" onClick={() => setActiveVideo(null)} className="text-sb-accent/60 hover:text-sb-accent"><X className="w-5 h-5" /></button>
              </div>
              <div className="aspect-video w-full rounded-xl overflow-hidden border border-sb-border">
                <iframe
                  title={activeVideo.title}
                  className="w-full h-full"
                  src={`https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent((activeVideo.query || activeVideo.title) + " educational for kids")}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <p className="text-xs text-sb-accent/40 mt-2">Safe search results only · no external links leave StudyBridge.</p>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-orange-50/50">Watch-and-learn · {content.videos.length} short videos for this chapter.</p>
            <div className="flex items-center gap-3">
              <span data-testid="watched-count" className="text-xs text-sb-accent font-medium">You've watched {watched.length}/{content.videos.length}</span>
              <div className="h-1.5 w-40 bg-sb-border rounded-full overflow-hidden">
                <div className="h-full bg-sb-accent transition-[width] duration-500" style={{ width: `${content.videos.length ? (watched.length / content.videos.length) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {content.videos.map((v, i) => {
              const seen = watched.includes(i);
              return (
                <button key={i} data-testid={`video-${i}`} onClick={() => openVideo(v, i)}
                  className={`sb-card rounded-2xl p-5 text-left hover:-translate-y-1 hover:border-sb-accent/30 transition-[transform,border-color] duration-300 sb-fade-up ${seen ? "border-sb-accent/40" : ""}`}
                  style={{ animationDelay: `${i * 0.03}s` }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-full bg-sb-accent/15 flex items-center justify-center"><Play className="w-4 h-4 text-sb-accent ml-0.5" /></div>
                    {seen ? <span data-testid={`video-watched-${i}`} className="flex items-center gap-1 text-[10px] text-sb-yellow"><CheckCircle2 className="w-3.5 h-3.5" /> Watched</span>
                          : <span className="text-[10px] text-sb-accent/50">{v.duration}</span>}
                  </div>
                  <p className="font-display text-sm text-orange-100 leading-snug">{v.title}</p>
                  <p className="text-xs text-orange-50/50 mt-1.5 leading-relaxed">{v.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tab === "labs" && content.lab && <LabRunner lab={content.lab} onComplete={onLabComplete} />}
    </div>
  );
}


function LabRunner({ lab, onComplete }) {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState("run"); // run -> predict -> result
  const [choice, setChoice] = useState(null);
  const p = lab.prediction || {};
  const steps = lab.steps || [];

  const runExperiment = () => { setPhase("result"); onComplete && onComplete(); };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="sb-card rounded-2xl p-6 border-2 border-sb-accent/30 sb-glow">
        <div className="flex items-center gap-2 text-sb-accent mb-2">
          <FlaskConical className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-[0.2em]">Virtual Lab</span>
        </div>
        <h2 className="font-display text-xl text-white">{lab.title}</h2>
        <p className="text-sm text-orange-50/70 mt-2 leading-relaxed">{lab.objective}</p>
        {lab.safety && <p className="text-xs text-sb-yellow mt-3">⚠ {lab.safety}</p>}
      </div>

      {lab.materials?.length > 0 && (
        <div className="sb-card rounded-2xl p-6">
          <p className="text-xs uppercase tracking-wide text-sb-accent/60 mb-3">Materials</p>
          <div className="flex flex-wrap gap-2">
            {lab.materials.map((m, i) => (
              <span key={i} className="text-xs bg-sb-elevated border border-sb-border rounded-full px-3 py-1 text-orange-50/80">{m}</span>
            ))}
          </div>
        </div>
      )}

      {phase === "run" && (
        <div className="sb-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-wide text-sb-accent/60">Step {step + 1} of {steps.length}</p>
            <div className="h-1 w-32 bg-sb-border rounded-full overflow-hidden">
              <div className="h-full bg-sb-accent transition-[width] duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
            </div>
          </div>
          <p data-testid="lab-step" className="font-body text-lg text-orange-50 leading-relaxed min-h-[3rem]">{steps[step]}</p>
          <div className="flex justify-between mt-6">
            <button disabled={step === 0} onClick={() => setStep(step - 1)} className="text-sb-accent/60 disabled:opacity-30">Back</button>
            {step < steps.length - 1 ? (
              <button data-testid="lab-next" onClick={() => setStep(step + 1)} className="bg-sb-accent text-sb-base px-6 py-2.5 rounded-full font-medium">Next step</button>
            ) : (
              <button data-testid="lab-predict" onClick={() => setPhase("predict")} className="bg-sb-accent text-sb-base px-6 py-2.5 rounded-full font-medium">Make a prediction</button>
            )}
          </div>
        </div>
      )}

      {phase === "predict" && (
        <div className="sb-card rounded-2xl p-6">
          <p className="font-display text-orange-100 mb-4">{p.question}</p>
          <div className="space-y-2.5">
            {(p.options || []).map((opt, i) => (
              <button key={i} data-testid={`lab-option-${i}`} onClick={() => setChoice(i)}
                className={`w-full text-left px-4 py-2.5 rounded-lg border transition-colors ${choice === i ? "border-sb-accent bg-sb-accent/15 text-orange-50" : "border-sb-border text-orange-50/70 hover:border-sb-accent/50"}`}>{opt}</button>
            ))}
          </div>
          <button data-testid="lab-check" disabled={choice == null} onClick={runExperiment}
            className="w-full mt-5 bg-sb-accent text-sb-base py-3 rounded-full font-medium disabled:opacity-40">Run experiment</button>
        </div>
      )}

      {phase === "result" && (
        <div className="sb-card rounded-2xl p-6 border-2 border-sb-accent/40 sb-glow">
          <div className="flex items-center gap-2 mb-3">
            {choice === p.answer_index
              ? <><CheckCircle2 className="w-6 h-6 text-sb-yellow" /><span className="font-display text-white">Great prediction!</span></>
              : <><FlaskConical className="w-6 h-6 text-sb-accent" /><span className="font-display text-white">Surprising result!</span></>}
          </div>
          <p className="text-sm text-orange-50/80 leading-relaxed">{p.result}</p>
          <button data-testid="lab-restart" onClick={() => { setStep(0); setPhase("run"); setChoice(null); }}
            className="mt-5 px-5 py-2.5 rounded-full border border-sb-border text-sb-accent text-sm hover:border-sb-accent">Run again</button>
        </div>
      )}
    </div>
  );
}
