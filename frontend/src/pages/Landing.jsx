import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, ShieldCheck, Sparkles, BookOpen, Timer, ArrowRight, Users } from "lucide-react";
import api from "@/lib/api";

const HERO = "https://images.unsplash.com/photo-1690788210614-9052cffd8a14?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400";

export default function Landing() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get("/stats").then(({ data }) => setStats(data)).catch(() => {}); }, []);

  return (
    <div className="min-h-screen bg-sb-base sb-grain">
      <header className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sb-accent flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-sb-base" />
          </div>
          <span className="font-display text-sb-accent">StudyBridge</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" data-testid="nav-login" className="text-sm text-sb-accent/70 hover:text-sb-accent px-4 py-2">Log in</Link>
          <Link to="/signup" data-testid="nav-signup" className="text-sm bg-sb-accent text-sb-base px-5 py-2.5 rounded-full font-medium hover:bg-sb-accentHover transition-colors">Get started</Link>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 pt-10 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <div className="sb-fade-up">
          <span className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-sb-accent/70 border border-sb-border rounded-full px-4 py-1.5 mb-6">
            <ShieldCheck className="w-3.5 h-3.5" /> Non-profit · K–12 · Since Aug 2026
          </span>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-white leading-[1.1] tracking-tight">
            Learning that <span className="text-sb-accent">bridges</span> every student forward.
          </h1>
          <p className="font-body text-lg text-orange-50/70 mt-6 max-w-xl leading-relaxed">
            AI-guided lessons, a personalized curriculum, and a study buddy that helps you <em>think</em> — never just hands you the answer. Safe by design for grades K through 12.
          </p>
          <div className="flex flex-wrap gap-4 mt-8">
            <Link to="/signup" data-testid="hero-cta" className="inline-flex items-center gap-2 bg-sb-accent text-sb-base px-7 py-3.5 rounded-full font-medium hover:bg-sb-accentHover transition-colors sb-glow">
              Start learning <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 border border-sb-border text-sb-accent px-7 py-3.5 rounded-full hover:border-sb-accent transition-colors">
              I have an account
            </Link>
          </div>
        </div>
        <div className="relative sb-fade-up" style={{ animationDelay: "0.15s" }}>
          <div className="rounded-3xl overflow-hidden border border-sb-border sb-glow">
            <img src={HERO} alt="Student learning" className="w-full h-[420px] object-cover" style={{ mixBlendMode: "luminosity", opacity: 0.9 }} />
          </div>
          <div className="absolute -bottom-6 -left-6 sb-card rounded-2xl p-5 backdrop-blur">
            <div className="flex items-center gap-2 text-sb-accent">
              <Users className="w-5 h-5" />
              <span className="font-display text-2xl">{stats ? stats.registered_users.toLocaleString() : "—"}</span>
            </div>
            <p className="text-xs text-orange-50/60 mt-1">learners registered</p>
            <div className="mt-3 h-1.5 w-48 bg-sb-border rounded-full overflow-hidden">
              <div className="h-full bg-sb-accent" style={{ width: `${stats?.progress_pct || 0}%` }} />
            </div>
            <p className="text-[10px] text-sb-accent/50 mt-1.5">Tutors & contests unlock at 10,000</p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-20 grid md:grid-cols-3 gap-6">
        {[
          { icon: BookOpen, t: "AI-crafted lessons", d: "Chapters, lessons, exercises and glossaries generated and cached per grade — reviewed before publish." },
          { icon: Sparkles, t: "Discuss, don't answer", d: "Our Study Buddy guides you with hints and questions so you truly learn — upload a photo of any problem." },
          { icon: Timer, t: "Focus Mode", d: "A distraction-free in-app timer that keeps you on your study pages until the session ends." },
        ].map((f, i) => (
          <div key={i} className="sb-card rounded-2xl p-8 hover:-translate-y-1 transition-transform duration-300">
            <div className="w-11 h-11 rounded-xl bg-sb-accent/15 flex items-center justify-center mb-5">
              <f.icon className="w-5 h-5 text-sb-accent" />
            </div>
            <h3 className="font-display text-lg text-orange-100 mb-2">{f.t}</h3>
            <p className="font-body text-sm text-orange-50/60 leading-relaxed">{f.d}</p>
          </div>
        ))}
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="sb-card rounded-3xl p-10 sm:p-14">
          <p className="text-xs tracking-[0.2em] uppercase text-sb-accent/70 mb-4">Our founder story</p>
          <h2 className="font-display text-2xl sm:text-3xl text-orange-50 mb-5">Built by students, for students.</h2>
          <p className="font-body text-orange-50/70 leading-loose">
            StudyBridge began in August 2026 with a simple belief: every learner — in a public school, a homeschool, or a small-town library — deserves a patient guide and a curriculum that meets them where they are. We're a non-profit, and we keep it safe: verifiable parental consent for our youngest learners, no piracy, no distractions, and AI that teaches rather than tells.
          </p>
        </div>
      </section>

      <footer className="border-t border-sb-border py-8 text-center text-xs text-sb-accent/40">
        StudyBridge · A non-profit learning platform · studybridge.contact@protonmail.com
      </footer>
    </div>
  );
}
