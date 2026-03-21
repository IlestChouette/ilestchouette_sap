"use client";

export default function PrintButton() {
  return (
    <div className="no-print" style={{ position: "fixed", top: 20, right: 20, zIndex: 100 }}>
      <button
        onClick={() => window.print()}
        style={{ background: "#F97316", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
      >
        🖨️ Imprimer / PDF
      </button>
    </div>
  );
}
