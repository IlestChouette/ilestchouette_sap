"use client";

import { useState } from "react";

export type Client = {
  id: string;
  nom: string;
  adresse: string | null;
  cp_ville: string | null;
  siren: string | null;
  email: string | null;
  tel: string | null;
};

export type DocRow = {
  id: string;
  created_at: string;
  type: "proforma" | "facture";
  numero: string;
  client_id: string;
  total: number;
  statut: string;
  proforma_id: string | null;
};

const STATUT: Record<string, [string, string]> = {
  emise: ["Émise", "bg-gray-100 text-gray-600"],
  validee: ["Validée → facturée", "bg-green-100 text-green-700"],
  payee: ["Payée", "bg-green-100 text-green-700"],
};

const input = "w-full border rounded-xl px-3 py-2 text-sm";
const label = "text-xs font-semibold text-gray-600 block mb-1";

export function DocumentsList({ docs, clients }: { docs: DocRow[]; clients: Client[] }) {
  const [filtre, setFiltre] = useState<"tous" | "proforma" | "facture">("tous");
  const nomClient = (id: string) => clients.find(c => c.id === id)?.nom ?? "-";
  const rows = docs.filter(d => filtre === "tous" || d.type === filtre);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(["tous", "proforma", "facture"] as const).map(f => (
          <button key={f} onClick={() => setFiltre(f)}
            className={`px-3 py-1 rounded-full text-xs font-semibold ${filtre === f ? "bg-gray-900 text-white" : "bg-white border text-gray-600"}`}>
            {f === "tous" ? "Tous" : f === "proforma" ? "Proformas" : "Factures"}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["N°", "Type", "Date", "Client", "Total", "Statut", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Aucun document</td></tr>}
            {rows.map(d => {
              const [txt, cls] = STATUT[d.statut] ?? [d.statut, "bg-gray-100 text-gray-600"];
              return (
                <tr key={d.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{d.numero}</td>
                  <td className="px-4 py-3">{d.type === "proforma" ? "Proforma" : "Facture"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(d.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-3 font-semibold">{nomClient(d.client_id)}</td>
                  <td className="px-4 py-3 font-semibold text-orange-600">{Number(d.total).toFixed(2)} €</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{txt}</span></td>
                  <td className="px-4 py-3">
                    <a href={`/admin/edl/document/${d.id}`} target="_blank" className="text-orange-500 hover:text-orange-700 text-xs font-semibold">
                      {d.type === "proforma" && d.statut !== "validee" ? "Ouvrir / valider" : "Ouvrir"}
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const emptyClient = { id: "", nom: "", adresse: "", cp_ville: "", siren: "", email: "", tel: "" };

export function ClientsList({ clients, onSaved }: { clients: Client[]; onSaved: () => void }) {
  const [form, setForm] = useState<typeof emptyClient | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/missions-docs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "client_save", client: { ...form, id: form!.id || undefined } }),
    });
    if (!r.ok) { alert((await r.json()).error); return; }
    setForm(null);
    onSaved();
  }

  const field = (k: keyof typeof emptyClient, l: string, ph = "") => (
    <div>
      <label className={label}>{l}</label>
      <input className={input} value={form![k]} placeholder={ph} required={k === "nom"}
        onChange={e => setForm(f => f && { ...f, [k]: e.target.value })} />
    </div>
  );

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setForm(emptyClient)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-semibold text-sm">
          + Nouveau client
        </button>
      </div>

      {form && (
        <form onSubmit={submit} className="bg-white rounded-2xl shadow p-6 mb-6 grid grid-cols-2 gap-4">
          {field("nom", "Nom / raison sociale *", "ex: FV TRAVEL GROUP")}
          {field("siren", "SIREN (si professionnel)")}
          {field("adresse", "Adresse", "ex: 12 rue de France")}
          {field("cp_ville", "Code postal et ville", "ex: 06000 Nice")}
          {field("email", "Email")}
          {field("tel", "Téléphone")}
          <div className="col-span-2 flex gap-3">
            <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl font-semibold text-sm">Enregistrer</button>
            <button type="button" onClick={() => setForm(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-xl font-semibold text-sm">Annuler</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Client", "Adresse", "SIREN", "Contact", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Aucun client</td></tr>}
            {clients.map(c => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold">{c.nom}</td>
                <td className="px-4 py-3 text-gray-600">
                  {[c.adresse, c.cp_ville].filter(Boolean).join(", ") || <span className="text-amber-600">À compléter</span>}
                </td>
                <td className="px-4 py-3 text-gray-500">{c.siren || "-"}</td>
                <td className="px-4 py-3 text-gray-500">{[c.email, c.tel].filter(Boolean).join(" · ") || "-"}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => { setForm({ ...emptyClient, ...Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v ?? ""])) }); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="text-orange-500 hover:text-orange-700 text-xs font-semibold">
                    Modifier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
