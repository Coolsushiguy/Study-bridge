import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { BookOpen, Users, TrendingUp, ArrowRight, Sparkles, Compass, Eye } from "lucide-react";

// 12AM-9AM sleepy, 10AM-2PM wave, 3PM-6PM sunset, 7PM-12AM moon
function timeGreeting() {
  const h = new Date().getHours();
  if (h >= 0 && h < 10) return { emoji: "😴", label: "Still early" };
  if (h >= 10 && h < 15) return { emoji: "👋", label: "Good day" };
  if (h >= 15 && h < 19) return { emoji: "🌇", label: "Good evening" };
  return { emoji: "🌙", label: "Good night" };
}

function streakDisplay(current, justBroken) {
  if (justBroken) return { emoji: "🥶😓", label: "Streak lost — start a new one today" };
  if (!current) return { emoji: "✨", label: "Start your streak today" };
  if (current >= 30) return { emoji: "💪🔥", label: `${current} day streak` };
  if (current >= 14) return { emoji: "❤️‍🔥", label: `${current} day streak` };
  if (current >= 3) return { emoji: "🔥", label: `${current} day streak` };
  return { emoji: "✨", label: `${current} day streak` };
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [career, setCareer] = useState(null);

  useEffect(() => {
    api.get("/stats").then(({ data }) => setStats(data)).catch(() => {});
    api.get("/subjects").then(({ data }) => setSubjects(data.subjects)).catch(() => {});
    api.get("/career/retake-status").then(({ data }) => setCareer(data)).catch(() => {});
  }, []);

  const consentPending = user?.account_type === "parent_led" && !user?.consent_verified;
  const nextDueLabel = career?.next_due ? new Date(career.next_due).toLocaleDateString() : "";
  const greeting = timeGreeting();
  const streak = streakDisplay(user?.current_streak, user?.streak_just_broken);

  return (
    <div className="space-y-8">
      <div className="sb-fade-up">
        <p className="text-xs tracking-[0.2em] uppercase text-sb-accent/60">{greeting.label}</p>
        <h1 className="font-display text-3xl sm:text-4xl text-white mt-2">Hi, {user?.username}! {greeting.emoji}</h1>
        <p className="text-orange-50/60 mt-2 flex items-center gap-2 flex-wrap">
          <span>Grade {user?.grade}{user?.homeschool ? " · Homeschool" : ""}</span>
          <span>·</span>
          <span data-testid="dashboard-streak" className="inline-flex items-center gap-1">{streak.emoji} {streak.label}</span>
        </p>
      </div>

      {consentPending && (
        <div data-testid="consent-warning" className="sb-card rounded-2xl p-5 border-sb-accent/40 sb-glow">
          <p className="text-sb-accent font-medium">Parental consent pending</p>
          <p className="text-sm text-orange-50/60 mt-1">Ask a parent to open the consent link we emailed to complete COPPA verification.</p>
        </div>
      )}

      {career?.due && (
        <div data-testid="career-retake-nudge" className="sb-card rounded-2xl p-5 border-2 border-sb-accent/40 sb-glow flex items-center gap-4 flex-wrap">
          <div className="w-10 h-10 rounded-full bg-sb-accent/15 flex items-center justify-center shrink-0"><Compass className="w-5 h-5 text-sb-accent" /></div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-sb-accent font-medium">Time to refresh your Career test</p>
            <p className="text-sm text-orange-50/70 mt-1">It's been about 2 years since your last one — your interests may have grown. Retaking keeps your path up to date.</p>
          </div>
          <Link to="/onboarding" data-testid="career-retake-btn" className="bg-sb-accent text-sb-base px-5 py-2.5 rounded-full text-sm font-medium hover:bg-sb-accentHover transition-colors">Retake now</Link>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Users} label="Student users" value={stats ? `${stats.registered_users.toLocaleString()}${stats.nationwide ? " nationwide" : ""}` : "—"} sub={`${stats?.progress_pct || 0}% to 10k unlock`} />
        <StatCard icon={Eye} label="Site visits" value={stats ? stats.total_visits.toLocaleString() : "—"} sub={stats ? `${stats.visits_until_contests.toLocaleString()} until Contests` : "—"} />
        <StatCard icon={TrendingUp} label="Onboarding" value={user?.onboarding_complete ? "Complete" : "In progress"} sub={user?.needs_assessment ? "Assessments pending" : "Ready to learn"} />
        <StatCard icon={Sparkles} label="Sol" value="Always on" sub="Discuss, don't answer" />
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
