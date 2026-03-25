"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2 rounded-xl transition"
    >
      📄 Imprimer / Sauvegarder PDF
    </button>
  );
}
