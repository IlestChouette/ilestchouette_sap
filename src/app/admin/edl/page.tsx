"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Table edl_missions réutilisée : type_mission = type libre, gestionnaire = client, adresse = lieu, notes = description
type Mission = {
  id: string;
  date_mission: string;
  type_mission: string;
  adresse: string;
  montant_ht: number;
  numero_mission: string | null;
  notes: string | null;
  heure_debut: string | null;
  heure_fin: string | null;
  gestionnaire: string | null;
  paye: boolean;
  date_paiement: string | null;
};

const emptyForm = {
  date_mission: "",
  type_mission: "",
  adresse: "",
  montant_ht: "",
  numero_mission: "",
  notes: "",
  heure_debut: "",
  heure_fin: "",
  gestionnaire: "",
};

const input = "w-full border rounded-xl px-3 py-2 text-sm";
const label = "text-xs font-semibold text-gray-600 block mb-1";

export default function MissionsSpecifiquesPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedMois, setSelectedMois] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedClient, setSelectedClient] = useState("");
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetch("/api/admin/check")
      .then((r) => { if (!r.ok) window.location.href = "/admin"; })
      .catch(() => { window.location.href = "/admin"; });
    loadMissions();
  }, []);

  async function loadMissions() {
    setLoading(true);
    const { data } = await supabase.from("edl_missions").select("*").order("date_mission", { ascending: false });
    setMissions(data || []);
    setLoading(false);
  }

  function openEdit(m: Mission) {
    setForm({
      date_mission: m.date_mission,
      type_mission: m.type_mission || "",
      adresse: m.adresse || "",
      montant_ht: String(m.montant_ht),
      numero_mission: m.numero_mission || "",
      notes: m.notes || "",
      heure_debut: m.heure_debut || "",
      heure_fin: m.heure_fin || "",
      gestionnaire: m.gestionnaire || "",
    });
    setEditingId(m.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      date_mission: form.date_mission,
      type_mission: form.type_mission.trim(),
      adresse: form.adresse.trim(),
      montant_ht: parseFloat(form.montant_ht) || 0,
      numero_mission: form.numero_mission || null,
      notes: form.notes || null,
      heure_debut: form.heure_debut || null,
      heure_fin: form.heure_fin || null,
      gestionnaire: form.gestionnaire.trim() || null,
    };
    const { error } = editingId
      ? await supabase.from("edl_missions").update(payload).eq("id", editingId)
      : await supabase.from("edl_missions").insert(payload);
    if (error) { alert("Erreur : " + error.message); return; }
    closeForm();
    loadMissions();
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette mission ?")) return;
    await supabase.from("edl_missions").delete().eq("id", id);
    loadMissions();
  }

  async function togglePaye(m: Mission) {
    const paye = !m.paye;
    await supabase.from("edl_missions").update({
      paye,
      date_paiement: paye ? new Date().toISOString().split("T")[0] : null,
    }).eq("id", m.id);
    loadMissions();
  }

  const clients = [...new Set(missions.map(m => m.gestionnaire).filter(Boolean))] as string[];
  const selection = missions.filter(m =>
    m.date_mission?.startsWith(selectedMois) && (!selectedClient || m.gestionnaire === selectedClient)
  );
  const totalHT = selection.reduce((s, m) => s + m.montant_ht, 0);
  const totalPaye = selection.filter(m => m.paye).reduce((s, m) => s + m.montant_ht, 0);

  function openDoc(type: "proforma" | "facture") {
    const q = new URLSearchParams({ type });
    if (selectedClient) q.set("client", selectedClient);
    window.open(`/admin/edl/facture/${selectedMois}?${q}`, "_blank");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Missions spécifiques</h1>
            <p className="text-sm text-gray-500 mt-1">Tout type de mission — proforma et facturation</p>
          </div>
          <button onClick={() => { closeForm(); setShowForm(true); }} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-semibold text-sm">
            + Ajouter une mission
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">{editingId ? "Modifier la mission" : "Nouvelle mission"}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className={label}>Client *</label>
                <input className={input} required list="clients" value={form.gestionnaire} onChange={e => setForm(f => ({ ...f, gestionnaire: e.target.value }))} placeholder="ex: Agence Dupont" />
                <datalist id="clients">{clients.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div>
                <label className={label}>Type de mission *</label>
                <input className={input} required value={form.type_mission} onChange={e => setForm(f => ({ ...f, type_mission: e.target.value }))} placeholder="ex: Livraison, Conciergerie, Accompagnement…" />
              </div>
              <div>
                <label className={label}>Date *</label>
                <input type="date" className={input} required value={form.date_mission} onChange={e => setForm(f => ({ ...f, date_mission: e.target.value }))} />
              </div>
              <div>
                <label className={label}>Référence</label>
                <input className={input} value={form.numero_mission} onChange={e => setForm(f => ({ ...f, numero_mission: e.target.value }))} placeholder="ex: bon de commande client" />
              </div>
              <div>
                <label className={label}>Heure début</label>
                <input type="time" className={input} value={form.heure_debut} onChange={e => setForm(f => ({ ...f, heure_debut: e.target.value }))} />
              </div>
              <div>
                <label className={label}>Heure fin</label>
                <input type="time" className={input} value={form.heure_fin} onChange={e => setForm(f => ({ ...f, heure_fin: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className={label}>Lieu / adresse</label>
                <input className={input} value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} placeholder="ex: 14 avenue Jean Médecin, 06000 Nice" />
              </div>
              <div className="col-span-2">
                <label className={label}>Description</label>
                <textarea className={input} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Détail de la prestation (apparaît sur la facture)" />
              </div>
              <div>
                <label className={label}>Montant (€) *</label>
                <input type="number" step="0.01" min="0" className={input} required value={form.montant_ht} onChange={e => setForm(f => ({ ...f, montant_ht: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="col-span-2 flex gap-3 mt-2">
                <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl font-semibold text-sm">
                  {editingId ? "Enregistrer les modifications" : "Enregistrer"}
                </button>
                <button type="button" onClick={closeForm} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-xl font-semibold text-sm">Annuler</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold text-gray-700">Mois :</label>
            <input type="month" className="border rounded-xl px-3 py-2 text-sm" value={selectedMois} onChange={e => setSelectedMois(e.target.value)} />
            <label className="text-sm font-semibold text-gray-700">Client :</label>
            <select className="border rounded-xl px-3 py-2 text-sm" value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
              <option value="">Tous</option>
              {clients.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-sm text-gray-600 flex gap-4">
              <span><span className="font-bold text-gray-900">{selection.length}</span> mission(s)</span>
              <span>Total : <span className="font-bold text-orange-600">{totalHT.toFixed(2)} €</span></span>
              <span>Payé : <span className="font-bold text-green-600">{totalPaye.toFixed(2)} €</span></span>
            </div>
            <button onClick={() => openDoc("proforma")} disabled={!selection.length} className="bg-white border border-gray-900 hover:bg-gray-100 disabled:opacity-40 text-gray-900 px-4 py-2 rounded-xl font-semibold text-sm">
              📝 Proforma
            </button>
            <button onClick={() => openDoc("facture")} disabled={!selection.length} className="bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white px-4 py-2 rounded-xl font-semibold text-sm">
              📄 Facture
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow overflow-x-auto">
          <table className="w-full text-sm min-w-max">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["Date", "Client", "Type", "Réf.", "Lieu", "Montant", "Statut", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-center py-8 text-gray-400">Chargement...</td></tr>}
              {!loading && selection.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400">Aucune mission pour cette sélection</td></tr>}
              {!loading && selection.map(m => (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(m.date_mission).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-3 font-semibold">{m.gestionnaire || "-"}</td>
                  <td className="px-4 py-3">{m.type_mission}</td>
                  <td className="px-4 py-3 text-gray-500">{m.numero_mission || "-"}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{m.adresse || "-"}</td>
                  <td className="px-4 py-3 font-semibold text-orange-600">{m.montant_ht.toFixed(2)} €</td>
                  <td className="px-4 py-3">
                    <button onClick={() => togglePaye(m)} className={`px-3 py-1 rounded-full text-xs font-bold ${m.paye ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {m.paye ? `✓ Payé${m.date_paiement ? ` ${new Date(m.date_paiement).toLocaleDateString("fr-FR")}` : ""}` : "En attente"}
                    </button>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap flex gap-2">
                    <button onClick={() => openEdit(m)} className="text-orange-500 hover:text-orange-700 text-xs font-semibold">Modifier</button>
                    <button onClick={() => handleDelete(m.id)} className="text-red-400 hover:text-red-600 text-xs">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
