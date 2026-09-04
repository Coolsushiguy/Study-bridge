import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Landing from "@/pages/Landing";
import Contact from "@/pages/Contact";
import About from "@/pages/About";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ParentCreate from "@/pages/ParentCreate";
import Consent from "@/pages/Consent";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Onboarding from "@/pages/Onboarding";
import Learn from "@/pages/Learn";
import Subject from "@/pages/Subject";
import Chapter from "@/pages/Chapter";
import Settings from "@/pages/Settings";
import Layout from "@/components/Layout";

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sb-base">
      <div className="w-10 h-10 rounded-full border-2 border-sb-border border-t-sb-accent animate-spin" />
    </div>
  );
}

function Protected({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.needs_assessment && !user.onboarding_complete) {
    const deadline = user.assessment_deadline ? new Date(user.assessment_deadline) : null;
    const pastDeadline = deadline && new Date() >= deadline;
    // Before the skip is used, or once the 2-week grace period has expired, force onboarding.
    if (!user.assessment_skipped || pastDeadline) return <Navigate to="/onboarding" replace />;
  }
  return <Layout>{children}</Layout>;
}

function PublicOnly({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <Loading />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <div className="App min-h-screen bg-sb-base">
      <AuthProvider>
        <Toaster theme="dark" position="top-center" richColors />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
            <Route path="/parent-create" element={<PublicOnly><ParentCreate /></PublicOnly>} />
            <Route path="/consent" element={<Consent />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/learn" element={<Protected><Learn /></Protected>} />
            <Route path="/learn/:subjectKey" element={<Protected><Subject /></Protected>} />
            <Route path="/learn/:subjectKey/:chapterKey" element={<Protected><Chapter /></Protected>} />
            <Route path="/settings" element={<Protected><Settings /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}
