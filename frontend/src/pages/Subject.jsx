import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "@/lib/api";
import { ArrowLeft, BookMarked, Trophy, CheckCircle2 } from "lucide-react";

const STATE_STYLE = {
  mastery: { ring: "border-sb-accent sb-glow", label: "Mastered", color: "text-sb-accent", Icon: Trophy },
  pass: { ring: "border-sb-yellow/60", label: "Passed", color: "text-sb-yellow", Icon: CheckCircle2 },
  "in-progress": { ring: "border-sb-border", label: "In progress", color: "text-orange-50/50", Icon: BookMarked },
  new: { ring: "border-sb-border", label: "New", color: "text-orange-50/40", Icon: BookMarked },
};

export default function Subject() {
  const { subjectKey } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => { api.get(`/subjects/${subjectKey}`).then(({ data }) => setData(data)).catch(() => {}); }, [subjectKey]);

  if (!data) return <div className="text-orange-50/50">Loading…</div>;

  return (
    <div className="space-y-8">
      <Link to="/learn" className="inline-flex items-center gap-1.5 text-sm text-sb-accent/60 hover:text-sb-accent"><ArrowLeft className="w-4 h-4" /> All subjects</Link>
      <div className="sb-fade-up">
        <h1 className="font-display text-3xl sm:text-4xl text-white">{data.subject.name}</h1>
        <p className="text-orange-50/60 mt-2">{data.subject.blurb}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {data.chapters.map((ch, i) => {
          const st = STATE_STYLE[ch.state] || STATE_STYLE.new;
          return (
            <Link key={ch.key} to={`/learn/${subjectKey}/${ch.key}`} data-testid={`chapter-${ch.key}`}
              className={`sb-card rounded-2xl p-6 border-2 ${st.ring} hover:-translate-y-1 transition-transform duration-300 sb-fade-up`}
              style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-sb-accent/40 mb-1">Chapter {i + 1}</p>
                  <h3 className="font-display text-lg text-orange-100">{ch.title}</h3>
                </div>
                <st.Icon className={`w-5 h-5 ${st.color}`} />
              </div>
              <div className="flex items-center justify-between mt-5">
                <span className={`text-xs ${st.color}`}>{st.label}</span>
                {ch.best_score > 0 && <span className="text-xs text-orange-50/50">Best {ch.best_score}%</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
