"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MOIS_NOMS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

type EdlMission = {
  id: string;
  date_mission: string;
  type_mission: string;
  adresse: string;
  surface_m2: number;
  meuble: boolean;
  fd_sup: number;
  montant_ht: number;
  numero_mission: string | null;
  notes: string | null;
  heure_debut: string | null;
  heure_fin: string | null;
};

export default function FactureEdlPage() {
  const params = useParams();
  const router = useRouter();
  const mois = (params?.mois as string) ?? "";
  const [missions, setMissions] = useState<EdlMission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem("admin_authed") !== "1") {
      router.replace("/admin");
    }
  }, []);

  const [annee, moisNum] = mois.split("-");
  const nomMois = MOIS_NOMS[parseInt(moisNum) - 1] ?? "";
  const numeroFacture = `EDL-${mois.replace("-", "")}-001`;

  useEffect(() => {
    if (!mois) return;
    supabase
      .from("edl_missions")
      .select("*")
      .gte("date_mission", `${mois}-01`)
      .lte("date_mission", `${mois}-31`)
      .order("date_mission", { ascending: true })
      .then(({ data }) => {
        setMissions(data || []);
        setLoading(false);
      });
  }, [mois]);

  const totalHT = missions.reduce((s, m) => s + m.montant_ht, 0);
  const totalTVA = totalHT * 0.2;
  const totalTTC = totalHT * 1.2;

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      {/* Bouton imprimer - masqué à l'impression */}
      <div className="max-w-3xl mx-auto mb-4 flex justify-end print:hidden">
        <button
          onClick={() => window.print()}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl font-semibold text-sm"
        >
          🖨️ Imprimer / Enregistrer PDF
        </button>
      </div>

      {/* Facture */}
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-2xl p-10 print:shadow-none print:rounded-none print:p-8">

        {/* En-tête */}
        <div className="flex justify-between mb-8">
          <div>
            <p className="text-lg font-bold text-gray-900">Il est Chouette</p>
            <p className="text-sm text-gray-600">SASU au capital de 5 000 €</p>
            <p className="text-sm text-gray-600">SIREN : 942 069 949</p>
            <p className="text-sm text-gray-600">143 Promenade des Anglais</p>
            <p className="text-sm text-gray-600">06200 Nice</p>
            <p className="text-sm text-gray-600">Tél : 06 95 42 73 12</p>
            <p className="text-sm text-gray-600">allo@ilestchouette.fr</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">France EDL</p>
            <p className="text-sm text-gray-600">32 rue Molière</p>
            <p className="text-sm text-gray-600">69006 LYON</p>
            <p className="text-sm text-gray-600">Tél : 09 72 47 40 49</p>
            <p className="text-sm text-gray-600">comptabilite@france-edl.fr</p>
          </div>
        </div>

        {/* Titre facture */}
        <div className="border-2 border-gray-900 rounded-lg text-center py-3 mb-6">
          <h1 className="text-xl font-bold text-gray-900">FACTURE N° {numeroFacture}</h1>
        </div>

        {/* Infos facture */}
        <div className="flex justify-between mb-6 text-sm">
          <div><span className="text-gray-500">Date : </span><span className="font-semibold">{new Date().toLocaleDateString("fr-FR")}</span></div>
          <div><span className="text-gray-500">Période : </span><span className="font-semibold">{nomMois} {annee}</span></div>
        </div>

        <div className="mb-6 text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-2">
          <strong>Objet :</strong> Prestation états des lieux — {nomMois} {annee}
        </div>

        {/* Tableau missions */}
        {missions.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Aucune mission pour ce mois.</p>
        ) : (
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="text-left px-3 py-2 rounded-tl-lg">N° Mission</th>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Créneau</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Adresse du bien</th>
                <th className="text-left px-3 py-2">Surface</th>
                <th className="text-left px-3 py-2">Meublé</th>
                <th className="text-left px-3 py-2">FD Sup.</th>
                <th className="text-left px-3 py-2">HT</th>
                <th className="text-left px-3 py-2 rounded-tr-lg">TTC</th>
              </tr>
            </thead>
            <tbody>
              {missions.map((m, i) => (
                <tr key={m.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-3 py-2 text-gray-500">{m.numero_mission || "-"}</td>
                  <td className="px-3 py-2">{new Date(m.date_mission).toLocaleDateString("fr-FR")}</td>
                  <td className="px-3 py-2">{m.heure_debut && m.heure_fin ? `${m.heure_debut.slice(0,5)} - ${m.heure_fin.slice(0,5)}` : "-"}</td>
                  <td className="px-3 py-2 capitalize">{m.type_mission}</td>
                  <td className="px-3 py-2">{m.adresse}</td>
                  <td className="px-3 py-2">{m.surface_m2} m²</td>
                  <td className="px-3 py-2">{m.meuble ? "Oui" : "Non"}</td>
                  <td className="px-3 py-2">{m.fd_sup > 0 ? `${m.fd_sup.toFixed(2)} €` : "-"}</td>
                  <td className="px-3 py-2 font-semibold">{m.montant_ht.toFixed(2)} €</td>
                  <td className="px-3 py-2">{(m.montant_ht * 1.2).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Totaux */}
        <div className="flex justify-end mb-8">
          <div className="w-64 text-sm">
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-600">Total HT</span>
              <span className="font-semibold">{totalHT.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-600">TVA 20%</span>
              <span>{totalTVA.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between py-2 text-base font-bold">
              <span>Total TTC</span>
              <span className="text-orange-600">{totalTTC.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="border-t border-gray-200 pt-4 text-xs text-gray-400 text-center">
          <p>Il est Chouette — SASU — SIREN 942 069 949 — 143 Promenade des Anglais, 06200 Nice</p>
          <p className="mt-1">Facture à régler par virement bancaire — IBAN disponible sur demande</p>
        </div>

      </div>
    </div>
  );
}
