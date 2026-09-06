import { useState } from "react";

export default function TermsModal({ open, onClose, onAccept }) {
  const [agreed, setAgreed] = useState(false);

  if (!open) return null;

  const handleContinue = () => {
    if (!agreed) return;
    if (onAccept) onAccept();
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "white",
          color: "#1a1a1a",
          padding: "32px",
          borderRadius: "12px",
          maxWidth: "700px",
          width: "100%",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            overflowY: "auto",
            paddingRight: "8px",
            marginBottom: "20px",
            lineHeight: 1.6,
          }}
        >
          <h2 style={{ marginTop: 0 }}>StudyBridge Terms & Conditions</h2>
          <p style={{ fontStyle: "italic", color: "#666" }}>
            Last updated: September 2026
          </p>

          <h3>1. Acceptance of Terms</h3>
          <p>
            By creating an account or using StudyBridge ("the Platform"), you
            agree to these Terms & Conditions. If you are under 18, a parent
            or legal guardian must review and accept these terms on your
            behalf, and by permitting your use of the Platform, they do so.
          </p>

          <h3>2. Eligibility & Accounts</h3>
          <p>
            StudyBridge is a student-led nonprofit platform connecting
            student tutors with students seeking academic help. Users in
            grade 5 and under must have an account created and managed by a
            parent or legal guardian. Users grade 6 and above may create
            their own account, subject to parental oversight settings where
            applicable. You agree to provide accurate information during
            signup, including school and district details.
          </p>

          <h3>3. Tutor Verification & Conduct</h3>
          <p>
            Student tutors are subject to eligibility requirements (including
            minimum GPA and a clean behavior record) and annual
            re-verification. StudyBridge reserves the right to suspend,
            demote, or permanently remove any tutor or student for violations
            of our code of conduct, including but not limited to harassment,
            dishonesty, or misuse of the messaging or AI systems.
          </p>

          <h3>4. Messaging & Communication</h3>
          <p>
            Messaging is restricted to matched tutor-student pairs and
            admin-user communication. All messages may be logged and
            reviewed for safety and moderation purposes. Users may report or
            block other users at any time.
          </p>

          <h3>5. Sol AI</h3>
          <p>
            StudyBridge provides an AI-assisted learning tool ("Sol AI")
            intended to support, not replace, human tutoring and
            instruction. Sol AI's responses may contain errors and should
            not be treated as a substitute for professional academic or
            educational advice.
          </p>

          <h3>6. Privacy & Children's Data</h3>
          <p>
            We collect certain personal information (name, school, district,
            academic records) necessary to operate the Platform. For users
            under 13, we collect only the information necessary for
            participation and require verifiable parental consent before
            collection, in accordance with applicable law. Parents may
            review, request deletion of, or restrict further collection of
            their child's information at any time by contacting us at
            studybridge.cooperate@protonmail.com.
          </p>

          <h3>7. Academic Outcomes</h3>
          <p>
            StudyBridge does not guarantee specific academic results, grade
            improvements, or admissions outcomes from use of the Platform.
          </p>

          <h3>8. Intellectual Property</h3>
          <p>
            All original content, curricula, and platform design are the
            property of StudyBridge. Users retain ownership of original work
            they submit (e.g., assignment responses) but grant StudyBridge a
            limited license to store and process that content to operate the
            Platform.
          </p>

          <h3>9. Limitation of Liability</h3>
          <p>
            StudyBridge is provided "as is" without warranties of any kind.
            To the fullest extent permitted by law, StudyBridge and its
            founders are not liable for indirect, incidental, or
            consequential damages arising from use of the Platform.
          </p>

          <h3>10. Termination</h3>
          <p>
            We reserve the right to suspend or terminate any account that
            violates these terms or poses a safety risk to other users.
          </p>

          <h3>11. Changes to These Terms</h3>
          <p>
            We may update these Terms from time to time. Continued use of
            the Platform after changes take effect constitutes acceptance of
            the revised terms.
          </p>

          <h3>12. Contact</h3>
          <p>
            Questions about these terms can be sent to
            studybridge.cooperate@protonmail.com.
          </p>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            fontSize: "14px",
            marginBottom: "16px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: "3px" }}
          />
          I have read and agree to the StudyBridge Terms & Conditions.
        </label>

        <button
          onClick={handleContinue}
          disabled={!agreed}
          style={{
            padding: "12px 20px",
            borderRadius: "8px",
            border: "none",
            fontWeight: 600,
            fontSize: "15px",
            cursor: agreed ? "pointer" : "not-allowed",
            background: agreed ? "#598556" : "#ccc",
            color: "white",
            transition: "background 0.2s",
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
