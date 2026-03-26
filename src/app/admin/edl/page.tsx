"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Grille tarifaire France EDL
function calculerTarifHT(surfaceM2: number, meuble: boolean, fdSup: number): number {
  let base = 0;
  if (surfaceM2 <= 50) base = 40;
  else if (surfaceM2 <= 100) base = 60;
  else if (surfaceM2 <= 200) base = 80;
  else if (surfaceM2 <= 300) base = 100;
  else if (surfaceM2 <= 400) base = 120;
  else if (surfaceM2 <= 500) base = 140;
  else base = 0; // Sur devis
  if (meuble) base += 10;
  return base + fdSup;
}

type EdlMission = {
  id: string;
  created_at: string;
  date_mission: string;
  type_mission: string;
  adresse: string;
  surface_m2: number;
  meuble: boolean;
  fd_sup: number;
  montant_ht: number;
  numero_mission: string | null;
  notes: string | null;
  facture_mois: string | null;
};

const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

export default function EdlPage() {
  const [missions, setMissions] = useState<EdlMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedMois, setSelectedMois] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Formulaire
  const [form, setForm] = useState({
    date_mission: "",
    type_mission: "sortant",
    adresse: "",
    surface_m2: "",
    meuble: false,
    fd_sup: "0",
    numero_mission: "",
    notes: "",
  });

  useEffect(() => {
    loadMissions();
  }, []);

  async function loadMissions() {
    setLoading(true);
    const { data } = await supabase
      .from("edl_missions")
      .select("*")
      .order("date_mission", { ascending: false });
    setMissions(data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const surface = parseInt(form.surface_m2);
    const fdSup = parseFloat(form.fd_sup) || 0;
    const montantHt = calculerTarifHT(surface, form.meuble, fdSup);

    await supabase.from("edl_missions").insert({
      date_mission: form.date_mission,
      type_mission: form.type_mission,
      adresse: form.adresse,
      surface_m2: surface,
      meuble: form.meuble,
      fd_sup: fdSup,
      montant_ht: montantHt,
      numero_mission: form.numero_mission || null,
      notes: form.notes || null,
    });

    setShowForm(false);
    setForm({ date_mission: "", type_mission: "sortant", adresse: "", surface_m2: "", meuble: false, fd_sup: "0", numero_mission: "", notes: "" });
    loadMissions();
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette mission ?")) return;
    await supabase.from("edl_missions").delete().eq("id", id);
    loadMissions();
  }

  // Filtrer par mois sélectionné
  const missionsDuMois = missions.filter(m => m.date_mission?.startsWith(selectedMois));
  const totalHT = missionsDuMois.reduce((s, m) => s + m.montant_ht, 0);
  const totalTTC = totalHT * 1.2;

  // Générer numéro de facture : EDL-AAAAMM-001
  const numeroFacture = `EDL-${selectedMois.replace("-", "")}-001`;

  function genererFacturePDF() {
    const [annee, mois] = selectedMois.split("-");
    const nomMois = MOIS[parseInt(mois) - 1];
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; margin: 40px; color: #222; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .title { text-align: center; font-size: 16px; font-weight: bold; margin: 20px 0; border: 2px solid #222; padding: 8px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #333; color: white; padding: 8px; text-align: left; font-size: 11px; }
          td { padding: 7px 8px; border-bottom: 1px solid #ddd; }
          .total-row { font-weight: bold; background: #f5f5f5; }
          .footer { margin-top: 30px; font-size: 11px; color: #555; }
          .info-block { margin-bottom: 20px; }
          .info-block h3 { font-size: 12px; font-weight: bold; margin-bottom: 4px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <strong>Il est Chouette</strong><br>
            SASU au capital de 5 000 €<br>
            SIREN : 942 069 949<br>
            143 Promenade des Anglais<br>
            06200 Nice<br>
            Tel : 06 95 42 73 12<br>
            allo@ilestchouette.fr
          </div>
          <div style="text-align:right">
            <strong>France EDL</strong><br>
            32 rue Molière<br>
            69006 LYON<br>
            Tel : 09 72 47 40 49
          </div>
        </div>

        <div class="title">FACTURE N° ${numeroFacture}</div>

        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
          <div><strong>Date :</strong> ${new Date().toLocaleDateString("fr-FR")}</div>
          <div><strong>Période :</strong> ${nomMois} ${annee}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>N° Mission</th>
              <th>Date</th>
              <th>Type</th>
              <th>Adresse du bien</th>
              <th>Surface</th>
              <th>Meublé</th>
              <th>FD Sup.</th>
              <th>Montant HT</th>
              <th>Montant TTC</th>
            </tr>
          </thead>
          <tbody>
            ${missionsDuMois.map(m => `
              <tr>
                <td>${m.numero_mission || "-"}</td>
                <td>${new Date(m.date_mission).toLocaleDateString("fr-FR")}</td>
                <td>${m.type_mission === "entrant" ? "Entrant" : "Sortant"}</td>
                <td>${m.adresse}</td>
                <td>${m.surface_m2} m²</td>
                <td>${m.meuble ? "Oui" : "Non"}</td>
                <td>${m.fd_sup > 0 ? m.fd_sup.toFixed(2) + " €" : "-"}</td>
                <td>${m.montant_ht.toFixed(2)} €</td>
                <td>${(m.montant_ht * 1.2).toFixed(2)} €</td>
              </tr>
            `).join("")}
            <tr class="total-row">
              <td colspan="7" style="text-align:right"><strong>TOTAL</strong></td>
              <td><strong>${totalHT.toFixed(2)} €</strong></td>
              <td><strong>${totalTTC.toFixed(2)} €</strong></td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:20px; text-align:right">
          <table style="margin-left:auto; width:300px;">
            <tr><td>Total HT</td><td style="text-align:right"><strong>${totalHT.toFixed(2)} €</strong></td></tr>
            <tr><td>TVA 20%</td><td style="text-align:right">${(totalHT * 0.2).toFixed(2)} €</td></tr>
            <tr style="font-size:14px; font-weight:bold;"><td>Total TTC</td><td style="text-align:right">${totalTTC.toFixed(2)} €</td></tr>
          </table>
        </div>

        <div class="footer">
          <p><strong>Objet :</strong> Prestation états des lieux — ${nomMois} ${annee}</p>
          <p>Facture à régler par virement. IBAN disponible sur demande.</p>
          <p>Facture conforme aux exigences France EDL.</p>
        </div>

        <div style="text-align:center; margin-top:40px;">
          <button onclick="window.print()" style="padding:10px 24px; background:#f97316; color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px;">
            Imprimer / Enregistrer PDF
          </button>
        </div>
      </body>
      </html>
    `;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  }

  const surfacePreview = parseInt(form.surface_m2) || 0;
  const fdSupPreview = parseFloat(form.fd_sup) || 0;
  const tarifPreview = surfacePreview > 0 ? calculerTarifHT(surfacePreview, form.meuble, fdSupPreview) : null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">France EDL — États des lieux</h1>
            <p className="text-sm text-gray-500 mt-1">Gestion des missions et facturation mensuelle</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-semibold text-sm"
          >
            + Ajouter une mission
          </button>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">Nouvelle mission</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">N° Mission (France EDL)</label>
                <input className="w-full border rounded-xl px-3 py-2 text-sm" value={form.numero_mission} onChange={e => setForm(f => ({...f, numero_mission: e.target.value}))} placeholder="ex: 172357" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Date de la mission *</label>
                <input type="date" className="w-full border rounded-xl px-3 py-2 text-sm" required value={form.date_mission} onChange={e => setForm(f => ({...f, date_mission: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Type *</label>
                <select className="w-full border rounded-xl px-3 py-2 text-sm" value={form.type_mission} onChange={e => setForm(f => ({...f, type_mission: e.target.value}))}>
                  <option value="entrant">Entrant</option>
                  <option value="sortant">Sortant</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Surface (m²) *</label>
                <input type="number" className="w-full border rounded-xl px-3 py-2 text-sm" required value={form.surface_m2} onChange={e => setForm(f => ({...f, surface_m2: e.target.value}))} placeholder="ex: 91" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600 block mb-1">Adresse du bien *</label>
                <input className="w-full border rounded-xl px-3 py-2 text-sm" required value={form.adresse} onChange={e => setForm(f => ({...f, adresse: e.target.value}))} placeholder="ex: 14 avenue Joseph Garnier, 06100 Nice" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Meublé</label>
                <select className="w-full border rounded-xl px-3 py-2 text-sm" value={form.meuble ? "oui" : "non"} onChange={e => setForm(f => ({...f, meuble: e.target.value === "oui"}))}>
                  <option value="non">Non</option>
                  <option value="oui">Oui (+10€)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Frais déplacement sup. (€ HT)</label>
                <input type="number" step="0.01" className="w-full border rounded-xl px-3 py-2 text-sm" value={form.fd_sup} onChange={e => setForm(f => ({...f, fd_sup: e.target.value}))} placeholder="0" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600 block mb-1">Notes</label>
                <input className="w-full border rounded-xl px-3 py-2 text-sm" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="ex: T4, Appartement, Gestionnaire Mme DURAND..." />
              </div>

              {tarifPreview !== null && (
                <div className="col-span-2 bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm">
                  <span className="text-gray-600">Tarif calculé : </span>
                  <span className="font-bold text-orange-600">{tarifPreview.toFixed(2)} € HT</span>
                  <span className="text-gray-500"> ({(tarifPreview * 1.2).toFixed(2)} € TTC)</span>
                </div>
              )}

              <div className="col-span-2 flex gap-3 mt-2">
                <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl font-semibold text-sm">Enregistrer</button>
                <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-xl font-semibold text-sm">Annuler</button>
              </div>
            </form>
          </div>
        )}

        {/* Sélecteur de mois + Facture */}
        <div className="bg-white rounded-2xl shadow p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-700">Mois :</label>
            <input
              type="month"
              className="border rounded-xl px-3 py-2 text-sm"
              value={selectedMois}
              onChange={e => setSelectedMois(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-bold text-gray-900">{missionsDuMois.length}</span> mission(s) —
              <span className="font-bold text-orange-600 ml-1">{totalHT.toFixed(2)} € HT</span>
              <span className="text-gray-400 ml-1">({totalTTC.toFixed(2)} € TTC)</span>
            </div>
            <button
              onClick={genererFacturePDF}
              disabled={missionsDuMois.length === 0}
              className="bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white px-4 py-2 rounded-xl font-semibold text-sm"
            >
              Générer facture PDF
            </button>
          </div>
        </div>

        {/* Liste des missions */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">N° Mission</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Adresse</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Surface</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Meublé</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">FD Sup</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Montant HT</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">TTC</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={10} className="text-center py-8 text-gray-400">Chargement...</td></tr>
              )}
              {!loading && missions.length === 0 && (
                <tr><td colSpan={10} className="text-center py-8 text-gray-400">Aucune mission enregistrée</td></tr>
              )}
              {!loading && missions.map(m => (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{m.numero_mission || "-"}</td>
                  <td className="px-4 py-3">{new Date(m.date_mission).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.type_mission === "entrant" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                      {m.type_mission === "entrant" ? "Entrant" : "Sortant"}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate">{m.adresse}</td>
                  <td className="px-4 py-3">{m.surface_m2} m²</td>
                  <td className="px-4 py-3">{m.meuble ? "✓" : "-"}</td>
                  <td className="px-4 py-3">{m.fd_sup > 0 ? `${m.fd_sup} €` : "-"}</td>
                  <td className="px-4 py-3 font-semibold text-orange-600">{m.montant_ht.toFixed(2)} €</td>
                  <td className="px-4 py-3 text-gray-500">{(m.montant_ht * 1.2).toFixed(2)} €</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(m.id)} className="text-red-400 hover:text-red-600 text-xs">Supprimer</button>
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
