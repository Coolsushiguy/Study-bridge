import { Link } from "react-router-dom";
import { ArrowLeft, GraduationCap } from "lucide-react";
import Footer from "@/components/Footer";

const SECTIONS = [
  {
    tag: "Why StudyBridge",
    title: "Every student deserves an open opportunity",
    body: "Students don’t always fall behind because they can’t learn. Sometimes, they just don’t have the time, money, or support they need. Tutoring can be expensive, classrooms can move too quickly or too slowly, and a lot of useful learning material is locked behind paywalls. We created StudyBridge to make extra help easier to access. Whether you go to public school, homeschool, or study on your own at a local library, you should be able to find good lessons, practice, and support without having to pay for it.",
  },
  {
    tag: "What is StudyBridge",
    title: "Educational Resources for Everyone",
    body: "StudyBridge is a non-profit K-12 learning platform built around how students actually learn. Instead of a one-size-fits-all curriculum, kids get lessons tailored to their skill level and interests. Content is broken into short, manageable chapters, paired with a study assistant designed to guide students through problems rather than just giving them the answers. With built-in tools like Focus Mode to limit distractions and strict privacy controls requiring parental consent for younger kids, it gives students a safe, structure-driven space to build real study habits.",
  },
  {
    tag: "How was StudyBridge Made",
    title: "Built deliberately, made with dilligence",
    body: "StudyBridge started in August 2026 as a non-profit project by 2 students of the Francis Howell School District, Vijval Satheesh-Kumar & Sushanth Ventherla focused on helping students catch up and go far beyond. We are a COPPA-approved website and app for younger students.",
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-sb-base sb-grain relative overflow-hidden">
      <ElectricLights />

      <div className="max-w-4xl mx-auto px-6 py-16 relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-sb-accent/70 hover:text-sb-accent mb-10">
          <ArrowLeft className="w-4 h-4" /> Back to StudyBridge
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-sb-accent flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-sb-base" />
          </div>
          <h1 className="font-display text-3xl text-white">About StudyBridge</h1>
        </div>

        <div className="space-y-8 mt-10">
          {SECTIONS.map((s) => (
            <div key={s.tag} className="sb-card rounded-3xl p-8 sm:p-10">
              <p className="text-xs tracking-[0.2em] uppercase text-sb-accent/70 mb-3">{s.tag}</p>
              <h2 className="font-display text-xl sm:text-2xl text-orange-50 mb-4">{s.title}</h2>
              <p className="font-body text-orange-50/70 leading-loose">{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}

// Animated "electric" moving orange light streaks spanning the screen.
// Pure CSS transforms/opacity — respects prefers-reduced-motion.
function ElectricLights() {
  const streaks = [
    { top: "8%", duration: "6s", delay: "0s", height: "2px" },
    { top: "22%", duration: "8s", delay: "1.2s", height: "1px" },
    { top: "41%", duration: "5.5s", delay: "0.4s", height: "2px" },
    { top: "63%", duration: "9s", delay: "2s", height: "1px" },
    { top: "78%", duration: "7s", delay: "0.8s", height: "2px" },
    { top: "92%", duration: "6.5s", delay: "1.6s", height: "1px" },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden="true">
      {streaks.map((s, i) => (
        <div
          key={i}
          className="sb-electric-streak"
          style={{
            top: s.top,
            height: s.height,
            animationDuration: s.duration,
            animationDelay: s.delay,
          }}
        />
      ))}
      <style>{`
        .sb-electric-streak {
          position: absolute;
          left: -30%;
          width: 30%;
          background: linear-gradient(90deg, transparent, rgba(250,135,32,0.9), rgba(255,200,120,1), rgba(250,135,32,0.9), transparent);
          box-shadow: 0 0 12px rgba(250,135,32,0.8), 0 0 24px rgba(250,135,32,0.4);
          animation-name: sb-electric-move;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes sb-electric-move {
          from { left: -30%; }
          to { left: 130%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sb-electric-streak { animation: none; opacity: 0.15; left: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
