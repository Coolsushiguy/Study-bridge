import { Link } from "react-router-dom";
import { ArrowLeft, Mail, GraduationCap } from "lucide-react";

export default function Contact() {
  return (
    <div className="min-h-screen bg-sb-base text-orange-50">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-sb-accent/70 hover:text-sb-accent mb-10">
          <ArrowLeft className="w-4 h-4" /> Back to StudyBridge
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-sb-accent flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-sb-base" />
          </div>
          <h1 className="font-display text-3xl text-white">Contact Us</h1>
        </div>
        <p className="text-orange-50/60 mb-12 max-w-xl">
          Have a question, a partnership inquiry, or need help with your account? Reach out below.
        </p>

        <div className="grid sm:grid-cols-2 gap-6">
          <ContactCard
            title="Investor Relations"
            description="For partnership, funding, and non-profit inquiries."
            email="studybridge.contact@protonmail.com"
          />
          <ContactCard
            title="Help & Support"
            description="For account help, bug reports, or general questions."
            email="studybridge.cooperate@protonmail.com"
          />
        </div>
      </div>
    </div>
  );
}

function ContactCard({ title, description, email }) {
  return (
    <div className="sb-card rounded-2xl p-6">
      <div className="w-10 h-10 rounded-lg bg-sb-accent/15 flex items-center justify-center mb-4">
        <Mail className="w-5 h-5 text-sb-accent" />
      </div>
      <h2 className="font-display text-lg text-white mb-1">{title}</h2>
      <p className="text-sm text-orange-50/60 mb-4">{description}</p>
      <a href={`mailto:${email}`} className="text-sb-accent text-sm hover:underline break-all">
        {email}
      </a>
    </div>
  );
}
