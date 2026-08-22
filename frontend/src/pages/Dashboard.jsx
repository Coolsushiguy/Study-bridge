import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { BookOpen, Users, TrendingUp, ArrowRight, Sparkles } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    api.get("/stats").then(({ data }) => setStats(data)).catch(() => {});
    api.get("/subjects").then(({ data }) => setSubjects(data.subjects)).catch(() => {});
  }, []);

  const consentPending = user?.account_type === "parent_led" && !user?.consent_verified;

  return (
    <div className="space-y-8">
      <div className="sb-fade-up">
        <p className="text-xs tracking-[0.2em] uppercase text-sb-accent/60">Welcome back</p>
        <h1 className="font-display text-3xl sm:text-4xl text-white mt-2">Hi, @{user?.username} 👋</h1>
        <p className="text-orange-50/60 mt-2">Grade {user?.grade}{user?.homeschool ? " · Homeschool" : ""} · Let's keep the streak going.</p>
      </div>

      {consentPending && (
        <div data-testid="consent-warning" className="sb-card rounded-2xl p-5 border-sb-accent/40 sb-glow">
          <p className="text-sb-accent font-medium">Parental consent pending</p>
          <p className="text-sm text-orange-50/60 mt-1">Ask a parent to open the consent link we emailed to complete COPPA verification.</p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <StatCard icon={Users} label="Learners registered" value={stats ? stats.registered_users.toLocaleString() : "—"} sub={`${stats?.progress_pct || 0}% to 10k unlock`} />
        <StatCard icon={TrendingUp} label="Onboarding" value={user?.onboarding_complete ? "Complete" : "In progress"} sub={user?.needs_assessment ? "Assessments pending" : "Ready to learn"} />
        <StatCard icon={Sparkles} label="Study Buddy" value="Always on" sub="Discuss, don't answer" />
      </div>

      <div className="sb-card rounded-3xl p-8 sm:p-10">
        <p className="text-xs tracking-[0.2em] uppercase text-sb-accent/70 mb-3">Founder story</p>
        <h2 className="font-display text-xl sm:text-2xl text-orange-50 mb-4">Every learner, bridged forward.</h2>
        <p className="font-body text-orange-50/70 leading-loose max-w-3xl">
          Since August 2026, StudyBridge has been a non-profit built on one belief: a patient guide and a curriculum that meets you where you are should be free for every student — public school, homeschool, or library alike.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-orange-100">Jump into Learn</h2>
          <Link to="/learn" className="text-sm text-sb-accent flex items-center gap-1">All subjects <ArrowRight className="w-4 h-4" /></Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {subjects.map((s, i) => (
            <Link key={s.key} to={`/learn/${s.key}`} data-testid={`dash-subject-${s.key}`}
              className="sb-card rounded-2xl p-6 hover:-translate-y-1 hover:border-sb-accent/30 transition-[transform,border-color] duration-300 sb-fade-up"
              style={{ animationDelay: `${i * 0.05}s` }}>
              <BookOpen className="w-6 h-6 text-sb-accent mb-4" />
              <h3 className="font-display text-base text-orange-100">{s.name}</h3>
              <p className="text-xs text-orange-50/50 mt-1">{s.chapters.length} chapters</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="sb-card rounded-2xl p-6">
      <div className="w-10 h-10 rounded-lg bg-sb-accent/15 flex items-center justify-center mb-4"><Icon className="w-5 h-5 text-sb-accent" /></div>
      <p className="text-xs uppercase tracking-wide text-sb-accent/50">{label}</p>
      <p className="font-display text-2xl text-white mt-1">{value}</p>
      <p className="text-xs text-orange-50/40 mt-1">{sub}</p>
    </div>
  );
}
