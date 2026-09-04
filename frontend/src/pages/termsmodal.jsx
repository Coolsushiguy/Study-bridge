import { useState, useRef } from "react";
import { ShieldCheck } from "lucide-react";

const TERMS_INTRO = "By agreeing to the Terms and Conditions, I agree that:";

const TERMS_POINTS = [
  "I have read, understood, and agree to follow StudyBridge's Terms of Use, Privacy Policy, and applicable safety policies.",
  "I understand that tutors using StudyBridge may be independent individuals and are responsible for their own conduct, communications, tutoring services, and compliance with applicable laws.",
  "I understand that StudyBridge does not guarantee that every tutor or user will behave appropriately and cannot guarantee that all misconduct will be prevented or detected.",
  "I understand that StudyBridge may suspend or permanently ban tutors or other users who violate StudyBridge's rules or engage in inappropriate, abusive, exploitative, illegal, or unsafe conduct.",
  "I understand that StudyBridge may investigate reports of misconduct and may take appropriate action, including restricting accounts, removing content, and contacting parents, guardians, law enforcement, or other appropriate authorities when permitted or required by law.",
  "I understand that I should immediately report suspected abuse, harassment, grooming, threats, exploitation, or other unsafe behavior through StudyBridge's reporting system and, when appropriate, directly to the relevant authorities.",
  "I understand that StudyBridge is a platform that facilitates educational interactions and does not guarantee the qualifications, behavior, actions, or results of any individual tutor.",
  "I understand that I am responsible for my own actions and for complying with StudyBridge's rules while using the Service.",
  "I understand that StudyBridge's Terms include limitations of liability and other legal provisions to the maximum extent permitted by applicable law.",
  "I understand that nothing in the Terms removes or limits rights or protections that cannot legally be waived.",
  "If I am agreeing on behalf of a minor, I confirm that I am the minor's parent or legal guardian and have the authority to provide consent on the minor's behalf.",
  "I understand that agreeing to these Terms does not guarantee that the Service will be free from risks, misconduct, technical problems, or other issues.",
];

export default function TermsModal({ open, onAgree, onDecline, busy }) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const scrollRef = useRef(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 12;
    if (atBottom) setScrolledToBottom(true);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" data-testid="terms-modal">
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative w-full max-w-lg bg-sb-surface border border-sb-border rounded-2xl flex flex-col max-h-[85vh] sb-fade-up">
        <div className="px-6 pt-6 pb-4 border-b border-sb-border flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-sb-accent shrink-0" />
          <h2 className="font-display text-lg text-white">Terms and Conditions</h2>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          data-testid="terms-scroll-area"
          className="overflow-y-auto px-6 py-5 text-sm text-orange-50/75 leading-relaxed space-y-3"
        >
          <p className="text-orange-100">{TERMS_INTRO}</p>
          <ul className="space-y-3 list-disc pl-5">
            {TERMS_POINTS.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>

        <div className="px-6 py-5 border-t border-sb-border space-y-3">
          {!scrolledToBottom && (
            <p className="text-xs text-sb-accent/50 text-center">Scroll to the bottom to continue.</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              data-testid="terms-decline"
              onClick={onDecline}
              className="flex-1 py-2.5 rounded-full border border-sb-border text-sb-accent/70 hover:text-sb-accent text-sm"
            >
              Decline
            </button>
            <button
              type="button"
              data-testid="terms-agree"
              disabled={!scrolledToBottom || busy}
              onClick={onAgree}
              className="flex-1 py-2.5 rounded-full bg-sb-accent text-sb-base font-medium disabled:opacity-40 text-sm"
            >
              {busy ? "…" : "I Agree"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
