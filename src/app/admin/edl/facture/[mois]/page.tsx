"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MODES_REGLEMENT = ["Virement bancaire", "Chèque", "Espèces", "Carte bancaire"];

const MOIS_NOMS =["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

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
  const [isProforma, setIsProforma] = useState(search.get("type") === "proforma");
  const [modes, setModes] = useState<string[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  const [annee, moisNum] = mois.split("-");
  const nomMois = MOIS_NOMS[parseInt(moisNum) - 1] ?? "";
  const [numero, setNumero] = useState(`${isProforma ? "PRO" : "FAC"}-${mois.replace("-", "")}-001`);
  const [echeance, setEcheance] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

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

  function toggleMode(m: string) {
    setModes(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  }

  function validerEnFacture() {
    if (!confirm("Valider la proforma et générer la facture ?")) return;
    setIsProforma(false);
    setNumero(n => n.replace(/^PRO-/, "FAC-"));
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setEcheance(d.toISOString().slice(0, 10));
    const q = new URLSearchParams(search.toString());
    q.set("type", "facture");
    window.history.replaceState(null, "", `?${q}`);
  }
  const titre = isProforma ? "FACTURE PROFORMA" : "FACTURE";

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:min-h-0 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto mb-4 flex items-center justify-between gap-4 print:hidden">
        <label className="text-sm text-gray-600">
          N° : <input className="border rounded-lg px-2 py-1 text-sm ml-1" value={numero} onChange={e => setNumero(e.target.value)} />
        </label>
        <label className="text-sm text-gray-600">
          {isProforma ? "Valable jusqu'au" : "Échéance"} : <input type="date" className="border rounded-lg px-2 py-1 text-sm ml-1" value={echeance} onChange={e => setEcheance(e.target.value)} />
        </label>
        <span className="text-xs text-gray-500">Les zones client / objet sont modifiables en cliquant dessus</span>
        {isProforma && (
          <button onClick={validerEnFacture} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-semibold text-sm">
            ✅ Valider → Facture
          </button>
        )}
        <button onClick={() => window.print()} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl font-semibold text-sm">
          🖨️ Imprimer / PDF
        </button>
      </div>

      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-2xl p-10 print:shadow-none print:rounded-none print:p-0 print:max-w-none">

        <div className="flex justify-between mb-8 print:mb-3">
          <div>
            <Image src="/logo-chouette.png" alt="Il est Chouette" width={140} height={50} className="mb-2" />
            <p className="text-sm text-gray-600">SASU au capital de 5 000 €</p>
            <p className="text-sm text-gray-600">SIREN : 942 069 949 — RCS Nice</p>
            <p className="text-sm text-gray-600">143 Promenade des Anglais</p>
            <p className="text-sm text-gray-600">06200 Nice</p>
            <p className="text-sm text-gray-600">Tél : 06 95 42 73 12</p>
            <p className="text-sm text-gray-600">allo@ilestchouette.fr</p>
          </div>
          <div className="text-right text-sm text-gray-600 min-w-[200px] outline-none focus:bg-orange-50 rounded p-1" contentEditable suppressContentEditableWarning>
            <p className="text-lg font-bold text-gray-900">{client || "Nom du client"}</p>
            <p>Adresse</p>
            <p>Code postal, Ville</p>
            <p>SIREN client (si professionnel)</p>
            <p>Email / Tél</p>
          </div>
        </div>

        <div className="border-2 border-gray-900 rounded-lg text-center py-3 mb-6 print:py-1 print:mb-3">
          <h1 className="text-xl font-bold text-gray-900">{titre} N° {numero}</h1>
        </div>

        <div className="flex justify-between mb-6 text-sm print:mb-2">
          <div><span className="text-gray-500">Date d&apos;émission : </span><span className="font-semibold">{new Date().toLocaleDateString("fr-FR")}</span></div>
          <div><span className="text-gray-500">Période : </span><span className="font-semibold">{nomMois} {annee}</span></div>
          <div>
            <span className="text-gray-500">{isProforma ? "Valable jusqu'au : " : "Échéance : "}</span>
            <span className="font-semibold">{new Date(echeance).toLocaleDateString("fr-FR")}</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-4">Nature de l&apos;opération : prestation de services</p>

        <div className="mb-6 print:mb-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-2 outline-none focus:bg-orange-50" contentEditable suppressContentEditableWarning>
          <strong>Objet :</strong> Missions spécifiques — {nomMois} {annee}
        </div>

        {missions.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Aucune mission pour cette période.</p>
        ) : (
          <table className="w-full text-xs mb-6 print:mb-2">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="text-left px-2 py-2 rounded-tl-lg whitespace-nowrap">Date</th>
                <th className="text-left px-2 py-2">Prestation</th>
                <th className="text-left px-2 py-2 whitespace-nowrap">Réf.</th>
                <th className="text-right px-2 py-2 whitespace-nowrap">Qté</th>
                <th className="text-right px-2 py-2 whitespace-nowrap">P.U. HT</th>
                <th className="text-right px-2 py-2 rounded-tr-lg whitespace-nowrap">Total HT</th>
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
                  <td className="px-2 py-2 text-right align-top">1</td>
                  <td className="px-2 py-2 whitespace-nowrap text-right align-top">{m.montant_ht.toFixed(2)} €</td>
                  <td className="px-2 py-2 font-semibold whitespace-nowrap text-right align-top">{m.montant_ht.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex justify-end mb-4">
          <div className="w-64 text-sm">
            <div className="flex justify-between py-1 text-gray-600"><span>Total HT</span><span>{total.toFixed(2)} €</span></div>
            <div className="flex justify-between py-1 text-gray-600"><span>TVA</span><span>0,00 €</span></div>
            <div className="flex justify-between py-2 text-base font-bold border-t border-gray-200">
              <span>{isProforma ? "Total estimé" : "Net à payer"}</span>
              <span className="text-orange-600">{total.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        <div className="text-sm mb-4">
          <p className="font-semibold mb-1">
            Mode de règlement{isProforma ? " (cochez votre choix)" : ""} :
          </p>
          <div className="flex flex-wrap gap-4">
            {MODES_REGLEMENT.filter(m => isProforma || modes.includes(m)).map(m => (
              <label key={m} className="flex items-center gap-1 cursor-pointer print:cursor-auto">
                <input type="checkbox" checked={modes.includes(m)} onChange={() => toggleMode(m)} disabled={!isProforma} />
                {m}
              </label>
            ))}
            {!isProforma && modes.length === 0 && <span className="text-gray-500">Virement bancaire</span>}
          </div>
        </div>

        <div className="text-xs text-gray-500 space-y-1 mb-6 print:mb-2">
          <p className="italic">TVA non applicable, art. 293 B du CGI.</p>
          {isProforma ? (
            <p>Document proforma sans valeur comptable, ne constitue pas une facture. Offre valable jusqu&apos;au {new Date(echeance).toLocaleDateString("fr-FR")}.</p>
          ) : (
            <>
              <p>Paiement à réception, au plus tard le {new Date(echeance).toLocaleDateString("fr-FR")}. Pas d&apos;escompte pour paiement anticipé.</p>
              <p>En cas de retard de paiement : pénalités au taux de 3 fois le taux d&apos;intérêt légal (art. L441-10 du Code de commerce) et, pour les clients professionnels, indemnité forfaitaire pour frais de recouvrement de 40 € (art. D441-5).</p>
            </>
          )}
        </div>

        {isProforma && (
          <div className="border-2 border-gray-300 rounded-lg p-4 mb-6 print:p-2 print:mb-2 text-sm break-inside-avoid">
            <p className="font-bold mb-1">BON POUR ACCORD</p>
            <p className="text-xs text-gray-500 mb-4">Date, nom, signature et cachet du client, précédés de la mention manuscrite « Bon pour accord »</p>
            <div className="grid grid-cols-2 gap-6 text-xs text-gray-600">
              <div>
                <p className="mb-6">Date : ____ / ____ / ________</p>
                <p>Nom et qualité du signataire :</p>
                <p className="border-b border-gray-300 h-6" />
              </div>
              <div>
                <p>Signature et cachet :</p>
                <div className="border border-dashed border-gray-300 rounded h-24 print:h-16 mt-1" />
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 mt-8 print:pt-2 print:mt-2 text-xs text-gray-400 text-center">
          <p>Il est Chouette — SASU — SIREN 942 069 949 — 143 Promenade des Anglais, 06200 Nice</p>
          {!isProforma && <p className="mt-1">IBAN disponible sur demande</p>}
        </div>

      </div>
    </div>
  );
}
