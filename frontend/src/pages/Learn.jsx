import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import * as Icons from "lucide-react";

export default function Learn() {
  const [subjects, setSubjects] = useState([]);
  useEffect(() => { api.get("/subjects").then(({ data }) => setSubjects(data.subjects)).catch(() => {}); }, []);

  return (
    <div className="space-y-8">
      <div className="sb-fade-up">
        <p className="text-xs tracking-[0.2em] uppercase text-sb-accent/60">Learn</p>
        <h1 className="font-display text-3xl sm:text-4xl text-white mt-2">Pick a subject</h1>
        <p className="text-orange-50/60 mt-2">AI-crafted chapters, lessons, exercises and glossaries — tailored to your grade.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((s, i) => {
          const Icon = Icons[s.icon] || Icons.BookOpen;
          return (
            <Link key={s.key} to={`/learn/${s.key}`} data-testid={`subject-${s.key}`}
              className="sb-card rounded-3xl p-8 hover:-translate-y-1 hover:border-sb-accent/30 transition-[transform,border-color] duration-300 sb-fade-up"
              style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="w-12 h-12 rounded-2xl bg-sb-accent/15 flex items-center justify-center mb-5"><Icon className="w-6 h-6 text-sb-accent" /></div>
              <h3 className="font-display text-xl text-orange-100">{s.name}</h3>
              <p className="text-sm text-orange-50/60 mt-2 leading-relaxed">{s.blurb}</p>
              <p className="text-xs text-sb-accent/50 mt-4">{s.chapters.length} chapters →</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
