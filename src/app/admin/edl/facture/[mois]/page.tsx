"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MOIS_NOMS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

type Mission = {
  id: string;
  date_mission: string;
  type_mission: string;
  adresse: string;
  montant_ht: number;
  numero_mission: string | null;
  notes: string | null;
  gestionnaire: string | null;
};

export default function DocumentMissionsPage() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const mois = (params?.mois as string) ?? "";
  const client = search.get("client") ?? "";
  const isProforma = search.get("type") === "proforma";
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  const [annee, moisNum] = mois.split("-");
  const nomMois = MOIS_NOMS[parseInt(moisNum) - 1] ?? "";
  const [numero, setNumero] = useState(`${isProforma ? "PRO" : "FAC"}-${mois.replace("-", "")}-001`);

  useEffect(() => {
    fetch("/api/admin/check")
      .then((r) => { if (!r.ok) router.replace("/admin"); })
      .catch(() => router.replace("/admin"));
  }, [router]);

  useEffect(() => {
    if (!mois) return;
    const lastDay = new Date(parseInt(annee), parseInt(moisNum), 0).getDate();
    let q = supabase
      .from("edl_missions")
      .select("*")
      .gte("date_mission", `${mois}-01`)
      .lte("date_mission", `${mois}-${lastDay}`)
      .order("date_mission", { ascending: true });
    if (client) q = q.eq("gestionnaire", client);
    q.then(({ data }) => {
      setMissions(data || []);
      setLoading(false);
    });
  }, [mois, client, annee, moisNum]);

  const total = missions.reduce((s, m) => s + m.montant_ht, 0);
  const titre = isProforma ? "FACTURE PROFORMA" : "FACTURE";

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-3xl mx-auto mb-4 flex items-center justify-between gap-4 print:hidden">
        <label className="text-sm text-gray-600">
          N° : <input className="border rounded-lg px-2 py-1 text-sm ml-1" value={numero} onChange={e => setNumero(e.target.value)} />
        </label>
        <span className="text-xs text-gray-500">Les zones client / objet sont modifiables en cliquant dessus</span>
        <button onClick={() => window.print()} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl font-semibold text-sm">
          🖨️ Imprimer / PDF
        </button>
      </div>

      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-2xl p-10 print:shadow-none print:rounded-none print:p-8">

        <div className="flex justify-between mb-8">
          <div>
            <Image src="/logo-chouette.png" alt="Il est Chouette" width={140} height={50} className="mb-2" />
            <p className="text-sm text-gray-600">SASU au capital de 5 000 €</p>
            <p className="text-sm text-gray-600">SIREN : 942 069 949</p>
            <p className="text-sm text-gray-600">143 Promenade des Anglais</p>
            <p className="text-sm text-gray-600">06200 Nice</p>
            <p className="text-sm text-gray-600">Tél : 06 95 42 73 12</p>
            <p className="text-sm text-gray-600">allo@ilestchouette.fr</p>
          </div>
          <div className="text-right text-sm text-gray-600 min-w-[200px] outline-none focus:bg-orange-50 rounded p-1" contentEditable suppressContentEditableWarning>
            <p className="text-lg font-bold text-gray-900">{client || "Nom du client"}</p>
            <p>Adresse</p>
            <p>Code postal, Ville</p>
            <p>Email / Tél</p>
          </div>
        </div>

        <div className="border-2 border-gray-900 rounded-lg text-center py-3 mb-6">
          <h1 className="text-xl font-bold text-gray-900">{titre} N° {numero}</h1>
        </div>

        <div className="flex justify-between mb-6 text-sm">
          <div><span className="text-gray-500">Date : </span><span className="font-semibold">{new Date().toLocaleDateString("fr-FR")}</span></div>
          <div><span className="text-gray-500">Période : </span><span className="font-semibold">{nomMois} {annee}</span></div>
        </div>

        <div className="mb-6 text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-2 outline-none focus:bg-orange-50" contentEditable suppressContentEditableWarning>
          <strong>Objet :</strong> Missions spécifiques — {nomMois} {annee}
        </div>

        {missions.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Aucune mission pour cette période.</p>
        ) : (
          <table className="w-full text-xs mb-6">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="text-left px-2 py-2 rounded-tl-lg whitespace-nowrap">Date</th>
                <th className="text-left px-2 py-2">Prestation</th>
                <th className="text-left px-2 py-2 whitespace-nowrap">Réf.</th>
                <th className="text-right px-2 py-2 rounded-tr-lg whitespace-nowrap">Montant</th>
              </tr>
            </thead>
            <tbody>
              {missions.map((m, i) => (
                <tr key={m.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-2 py-2 whitespace-nowrap align-top">{new Date(m.date_mission).toLocaleDateString("fr-FR")}</td>
                  <td className="px-2 py-2">
                    <div className="font-semibold">{m.type_mission}</div>
                    {m.notes && <div className="text-gray-500">{m.notes}</div>}
                    {m.adresse && <div className="text-gray-400">{m.adresse}</div>}
                  </td>
                  <td className="px-2 py-2 text-gray-500 align-top">{m.numero_mission || "-"}</td>
                  <td className="px-2 py-2 font-semibold whitespace-nowrap text-right align-top">{m.montant_ht.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex justify-end mb-4">
          <div className="w-64 text-sm">
            <div className="flex justify-between py-2 text-base font-bold border-t border-gray-200">
              <span>{isProforma ? "Total estimé" : "Total à payer"}</span>
              <span className="text-orange-600">{total.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 italic mb-2">TVA non applicable — art. 293 B du CGI</p>
        {isProforma && (
          <p className="text-xs text-gray-500 mb-8">Document proforma sans valeur comptable — ne constitue pas une facture. Valable 30 jours.</p>
        )}

        <div className="border-t border-gray-200 pt-4 mt-8 text-xs text-gray-400 text-center">
          <p>Il est Chouette — SASU — SIREN 942 069 949 — 143 Promenade des Anglais, 06200 Nice</p>
          {!isProforma && <p className="mt-1">Facture à régler par virement bancaire — IBAN disponible sur demande</p>}
        </div>

      </div>
    </div>
  );
}
