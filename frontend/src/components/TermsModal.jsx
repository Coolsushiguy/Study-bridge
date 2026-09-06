export default function TermsModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    }}>
      <div style={{
        background: "white",
        padding: "24px",
        borderRadius: "8px",
        maxWidth: "500px",
      }}>
        <h2>Terms & Conditions</h2>
        <p>Terms and conditions content coming soon.</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
