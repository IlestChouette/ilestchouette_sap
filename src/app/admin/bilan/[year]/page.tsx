import { supabaseAdmin } from "../../../_lib/supabaseAdmin";
import Image from "next/image";
import PrintButton from "../PrintButton";

const SHEET_ID = "1It-TOn5Caf8TYjnoc-4rCrMJv2lZE9q1eV4b7FYuAr4";

function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim());
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuotes = !inQuotes; }
      else if (line[i] === "," && !inQuotes) { values.push(current.trim()); current = ""; }
      else { current += line[i]; }
    }
    values.push(current.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
}

function fmtEuro(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/[€\s]/g, "").replace(",", ".")) || 0;
}

export default async function BilanPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const yearShort = year.slice(2); // "25" pour 2025

  // Supabase : commandes terminées de l'année
  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("id, service_type, price_total, created_at, status")
    .eq("status", "terminee")
    .gte("created_at", `${year}-01-01`)
    .lte("created_at", `${year}-12-31`);

  // Google Sheets
  let allRecetes: Record<string, string>[] = [];
  let allDepenses: Record<string, string>[] = [];
  try {
    const [recetesRes, depensesRes] = await Promise.all([
      fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=RECETES`, { cache: "no-store" }),
      fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=DEPENSES`, { cache: "no-store" }),
    ]);
    const [recetesCsv, depensesCsv] = await Promise.all([recetesRes.text(), depensesRes.text()]);
    allRecetes = parseCsv(recetesCsv).filter((r) => (r["Date"] ?? "").includes(yearShort));
    allDepenses = parseCsv(depensesCsv).filter((d) => (d["Date"] ?? "").includes(yearShort));
  } catch (e) {
    console.error("Google Sheets fetch error:", e);
  }

  // Calculs
  const platformRevenue = (orders ?? []).reduce((s, o) => s + (o.price_total ?? 0), 0);
  const manualRevenue = allRecetes.reduce((s, r) => s + (parseFloat(r["Montant"] ?? "0") || 0), 0);
  const totalRevenue = platformRevenue + manualRevenue;
  const totalDepenses = allDepenses.reduce((s, d) => s + parseAmount(d["Montant TTC (€)"] ?? "0"), 0);
  const benefice = totalRevenue - totalDepenses;

  const SERVICES: Record<string, string> = {
    supermarket: "Courses supermarché", meds: "Médicaments", food: "Nourriture",
    keys: "Clés/Objets", shopping: "Achats boutique", concierge: "Conciergerie",
    express: "Express", eco: "Éco", it: "Informatique", assist: "Accompagnement",
    bricolage: "Bricolage", other: "Autre",
  };

  return (
    <main className="min-h-screen bg-gray-100 flex justify-center py-10 print:bg-white print:py-0">
      <div className="bg-white w-[800px] shadow-md p-10 print:shadow-none print:w-full">

        {/* Bouton impression (masqué à l'impression) */}
        <div className="flex justify-end mb-6 print:hidden">
          <PrintButton />
        </div>

        {/* EN-TÊTE */}
        <header className="flex items-start justify-between mb-8">
          <div>
            <Image src="/logo-chouette.png" alt="Il est Chouette" width={180} height={70} />
          </div>
          <div className="text-right text-sm text-gray-600">
            <p className="font-bold text-gray-900 text-lg">Il est Chouette</p>
            <p>143 Promenade des Anglais</p>
            <p>06200 Nice, France</p>
            <p>SIREN : 942 069 949 — SASU</p>
          </div>
        </header>

        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Bilan d&apos;activité {year}
        </h1>
        <p className="text-center text-sm text-gray-500 mb-8">
          Du 1er janvier {year} au 31 décembre {year}
        </p>

        {/* RÉSUMÉ */}
        <section className="grid grid-cols-2 gap-4 mb-8">
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Recettes plateforme</p>
            <p className="text-2xl font-bold text-green-700">{fmtEuro(platformRevenue)}</p>
            <p className="text-xs text-gray-400 mt-1">{(orders ?? []).length} commandes terminées</p>
          </div>
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Recettes manuelles</p>
            <p className="text-2xl font-bold text-blue-700">{fmtEuro(manualRevenue)}</p>
            <p className="text-xs text-gray-400 mt-1">{allRecetes.length} services réalisés</p>
          </div>
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Charges / Dépenses</p>
            <p className="text-2xl font-bold text-red-600">{fmtEuro(totalDepenses)}</p>
            <p className="text-xs text-gray-400 mt-1">{allDepenses.length} dépenses enregistrées</p>
          </div>
          <div className={`border-2 rounded-xl p-4 ${benefice >= 0 ? "border-orange-300 bg-orange-50" : "border-red-300 bg-red-50"}`}>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Bénéfice net</p>
            <p className={`text-2xl font-bold ${benefice >= 0 ? "text-orange-600" : "text-red-600"}`}>{fmtEuro(benefice)}</p>
            <p className="text-xs text-gray-400 mt-1">CA total : {fmtEuro(totalRevenue)}</p>
          </div>
        </section>

        {/* RECETTES PLATEFORME */}
        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4">
            Recettes plateforme — {fmtEuro(platformRevenue)}
          </h2>
          {(orders ?? []).length === 0 ? (
            <p className="text-sm text-gray-400">Aucune commande terminée en {year}.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-left py-2 px-2">Service</th>
                  <th className="text-right py-2 px-2">Montant</th>
                </tr>
              </thead>
              <tbody>
                {(orders ?? []).map((o) => (
                  <tr key={o.id} className="border-b border-gray-50">
                    <td className="py-1.5 px-2 text-gray-500">
                      {new Date(o.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="py-1.5 px-2 text-gray-700">{SERVICES[o.service_type] ?? o.service_type}</td>
                    <td className="py-1.5 px-2 text-right font-semibold text-gray-900">{fmtEuro(o.price_total ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={2} className="py-2 px-2 text-gray-700">Total plateforme</td>
                  <td className="py-2 px-2 text-right text-green-700">{fmtEuro(platformRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </section>

        {/* RECETTES MANUELLES */}
        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4">
            Recettes manuelles (espèces) — {fmtEuro(manualRevenue)}
          </h2>
          {allRecetes.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune recette manuelle en {year}.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-left py-2 px-2">Client</th>
                  <th className="text-left py-2 px-2">Service</th>
                  <th className="text-left py-2 px-2">N° Facture</th>
                  <th className="text-right py-2 px-2">Montant</th>
                </tr>
              </thead>
              <tbody>
                {allRecetes.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1.5 px-2 text-gray-500">{r["Date"]}</td>
                    <td className="py-1.5 px-2 text-gray-700">{r["Client"]}</td>
                    <td className="py-1.5 px-2 text-gray-600">{r["Service réalisé"]}</td>
                    <td className="py-1.5 px-2 text-gray-500 text-xs">{r["N° de facture "]}</td>
                    <td className="py-1.5 px-2 text-right font-semibold text-gray-900">{fmtEuro(parseFloat(r["Montant"] ?? "0") || 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={4} className="py-2 px-2 text-gray-700">Total recettes manuelles</td>
                  <td className="py-2 px-2 text-right text-blue-700">{fmtEuro(manualRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </section>

        {/* DÉPENSES */}
        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4">
            Charges et dépenses — {fmtEuro(totalDepenses)}
          </h2>
          {allDepenses.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune dépense enregistrée en {year}.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-left py-2 px-2">Fournisseur</th>
                  <th className="text-left py-2 px-2">Nature</th>
                  <th className="text-left py-2 px-2">Paiement</th>
                  <th className="text-right py-2 px-2">Montant TTC</th>
                </tr>
              </thead>
              <tbody>
                {allDepenses.map((d, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1.5 px-2 text-gray-500">{d["Date"]}</td>
                    <td className="py-1.5 px-2 text-gray-700">{d["Fournisseur"]}</td>
                    <td className="py-1.5 px-2 text-gray-600">{d["Description / Nature de l'achat"]}</td>
                    <td className="py-1.5 px-2 text-gray-500">{d["Mode de paiement"]}</td>
                    <td className="py-1.5 px-2 text-right font-semibold text-red-600">{d["Montant TTC (€)"]}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={4} className="py-2 px-2 text-gray-700">Total dépenses</td>
                  <td className="py-2 px-2 text-right text-red-700">{fmtEuro(totalDepenses)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </section>

        {/* BÉNÉFICE FINAL */}
        <section className="border-t-2 border-gray-900 pt-4 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Chiffre d&apos;affaires total</p>
              <p className="font-semibold text-gray-800">{fmtEuro(totalRevenue)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total charges</p>
              <p className="font-semibold text-red-600">− {fmtEuro(totalDepenses)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Bénéfice net</p>
              <p className={`text-2xl font-bold ${benefice >= 0 ? "text-orange-600" : "text-red-600"}`}>{fmtEuro(benefice)}</p>
            </div>
          </div>
        </section>

        <p className="text-xs text-gray-400 text-center">
          TVA non applicable, art. 293 B du CGI — Il est Chouette SASU — SIREN 942 069 949 — {year}
        </p>
      </div>
    </main>
  );
}
