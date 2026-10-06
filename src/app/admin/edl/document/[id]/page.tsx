"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

const MODES_REGLEMENT = ["Virement bancaire", "Chèque", "Espèces", "Carte bancaire"];
const MOIS_NOMS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

type Mission = {
  id: string;
  date_mission: string;
  type_mission: string;
  adresse: string | null;
  montant_ht: number;
  numero_mission: string | null;
  notes: string | null;
};

type Client = {
  nom: string;
  adresse: string | null;
  cp_ville: string | null;
  siren: string | null;
  email: string | null;
  tel: string | null;
};

type Doc = {
  id: string;
  created_at: string;
  type: "proforma" | "facture";
  numero: string;
  periode: string;
  total: number;
  echeance: string;
  modes: string[];
  statut: string;
  proforma_id: string | null;
};

const fr = (d: string) => new Date(d).toLocaleDateString("fr-FR");

async function post(body: object) {
  const r = await fetch("/api/admin/missions-docs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? "Erreur");
  return data;
}

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/missions-docs?doc=${id}`)
      .then(async r => {
        if (r.status === 401) return router.replace("/admin");
        const d = await r.json();
        if (!r.ok) return setError(d.error);
        setDoc(d.doc);
        setClient(d.client);
        setMissions(d.missions);
      })
      .catch(() => setError("Erreur réseau"));
  }, [id, router]);

  if (error) return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>;
  if (!doc || !client) return <div className="flex items-center justify-center min-h-screen text-gray-400">Chargement...</div>;

  const isProforma = doc.type === "proforma";
  const [annee, moisNum] = doc.periode.split("-");
  const nomMois = MOIS_NOMS[parseInt(moisNum) - 1] ?? "";
  const clientIncomplet = !client.adresse || !client.cp_ville;

  async function save(patch: Partial<Doc>) {
    setDoc(d => d && { ...d, ...patch });
    try { await post({ action: "doc_update", id: doc!.id, ...patch }); }
    catch (e) { alert((e as Error).message); }
  }

  async function valider() {
    if (!confirm("Valider la proforma et générer la facture ?")) return;
    try {
      const { id: factureId } = await post({ action: "doc_validate", id: doc!.id });
      router.push(`/admin/edl/document/${factureId}`);
    } catch (e) { alert((e as Error).message); }
  }

  function toggleMode(m: string) {
    save({ modes: doc!.modes.includes(m) ? doc!.modes.filter(x => x !== m) : [...doc!.modes, m] });
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:min-h-0 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto mb-4 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <a href="/admin/edl" className="text-sm text-gray-600 hover:text-gray-900">← Missions spécifiques</a>
        <label className="text-sm text-gray-600">
          {isProforma ? "Valable jusqu'au" : "Échéance"} :
          <input type="date" className="border rounded-lg px-2 py-1 text-sm ml-1" value={doc.echeance} onChange={e => save({ echeance: e.target.value })} />
        </label>
        {isProforma && doc.statut !== "validee" && (
          <button onClick={valider} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-semibold text-sm">
            ✅ Valider → Facture
          </button>
        )}
        {isProforma && doc.statut === "validee" && (
          <button onClick={valider} className="bg-white border border-green-600 text-green-700 px-4 py-2 rounded-xl font-semibold text-sm">
            Voir la facture
          </button>
        )}
        <button onClick={() => window.print()} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl font-semibold text-sm">
          🖨️ Imprimer / PDF
        </button>
        {clientIncomplet && (
          <p className="w-full text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Adresse du client incomplète : complétez sa fiche dans l&apos;onglet Clients avant d&apos;envoyer.
          </p>
        )}
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
          <div className="text-right text-sm text-gray-600 min-w-[200px]">
            <p className="text-lg font-bold text-gray-900">{client.nom}</p>
            {client.adresse && <p>{client.adresse}</p>}
            {client.cp_ville && <p>{client.cp_ville}</p>}
            {client.siren && <p>SIREN : {client.siren}</p>}
            {client.email && <p>{client.email}</p>}
            {client.tel && <p>{client.tel}</p>}
          </div>
        </div>

        <div className="border-2 border-gray-900 rounded-lg text-center py-3 mb-6 print:py-1 print:mb-3">
          <h1 className="text-xl font-bold text-gray-900">{isProforma ? "FACTURE PROFORMA" : "FACTURE"} N° {doc.numero}</h1>
        </div>

        <div className="flex justify-between mb-6 text-sm print:mb-2">
          <div><span className="text-gray-500">Date d&apos;émission : </span><span className="font-semibold">{fr(doc.created_at)}</span></div>
          <div><span className="text-gray-500">Période : </span><span className="font-semibold">{nomMois} {annee}</span></div>
          <div>
            <span className="text-gray-500">{isProforma ? "Valable jusqu'au : " : "Échéance : "}</span>
            <span className="font-semibold">{fr(doc.echeance)}</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-4">Nature de l&apos;opération : prestation de services</p>

        <div className="mb-6 print:mb-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-2">
          <strong>Objet :</strong> Missions spécifiques — {nomMois} {annee}
        </div>

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
                <td className="px-2 py-2 whitespace-nowrap align-top">{fr(m.date_mission)}</td>
                <td className="px-2 py-2">
                  <div className="font-semibold">{m.type_mission}</div>
                  {m.notes && <div className="text-gray-500">{m.notes}</div>}
                  {m.adresse && <div className="text-gray-400">{m.adresse}</div>}
                </td>
                <td className="px-2 py-2 text-gray-500 align-top">{m.numero_mission || "-"}</td>
                <td className="px-2 py-2 text-right align-top">1</td>
                <td className="px-2 py-2 whitespace-nowrap text-right align-top">{Number(m.montant_ht).toFixed(2)} €</td>
                <td className="px-2 py-2 font-semibold whitespace-nowrap text-right align-top">{Number(m.montant_ht).toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-4">
          <div className="w-64 text-sm">
            <div className="flex justify-between py-1 text-gray-600"><span>Total HT</span><span>{Number(doc.total).toFixed(2)} €</span></div>
            <div className="flex justify-between py-1 text-gray-600"><span>TVA</span><span>0,00 €</span></div>
            <div className="flex justify-between py-2 text-base font-bold border-t border-gray-200">
              <span>{isProforma ? "Total estimé" : "Net à payer"}</span>
              <span className="text-orange-600">{Number(doc.total).toFixed(2)} €</span>
            </div>
          </div>
        </div>

        <div className="text-sm mb-4">
          <p className="font-semibold mb-1">Mode de règlement{isProforma ? " (cochez votre choix)" : ""} :</p>
          <div className="flex flex-wrap gap-4">
            {MODES_REGLEMENT.filter(m => isProforma || doc.modes.includes(m)).map(m => (
              <label key={m} className="flex items-center gap-1 cursor-pointer print:cursor-auto">
                <input type="checkbox" checked={doc.modes.includes(m)} onChange={() => toggleMode(m)} disabled={!isProforma} />
                {m}
              </label>
            ))}
            {!isProforma && doc.modes.length === 0 && <span className="text-gray-500">Virement bancaire</span>}
          </div>
        </div>

        <div className="text-xs text-gray-500 space-y-1 mb-6 print:mb-2">
          <p className="italic">TVA non applicable, art. 293 B du CGI.</p>
          {isProforma ? (
            <p>Document proforma sans valeur comptable, ne constitue pas une facture. Offre valable jusqu&apos;au {fr(doc.echeance)}.</p>
          ) : (
            <>
              <p>Paiement à réception, au plus tard le {fr(doc.echeance)}. Pas d&apos;escompte pour paiement anticipé.</p>
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
