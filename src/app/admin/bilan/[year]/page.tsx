"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../_lib/supabaseClient";

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
  return parseFloat((raw ?? "").replace(/[€\s]/g, "").replace(",", ".")) || 0;
}

const SERVICES: Record<string, string> = {
  supermarket: "Courses supermarché", meds: "Médicaments", food: "Nourriture",
  keys: "Clés/Objets", shopping: "Achats boutique", concierge: "Conciergerie",
  express: "Express", eco: "Éco", it: "Informatique", assist: "Accompagnement",
  bricolage: "Bricolage", other: "Autre",
};

export default function BilanPage() {
  const params = useParams();
  const year = (params?.year as string) ?? new Date().getFullYear().toString();
  const yearShort = year.slice(2);

  const [orders, setOrders] = useState<any[]>([]);
  const [recetes, setRecetes] = useState<Record<string, string>[]>([]);
  const [depenses, setDepenses] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Supabase orders
      const { data } = await supabase
        .from("orders")
        .select("id, service_type, price_total, price_items, created_at")
        .eq("status", "terminee")
        .gte("created_at", `${year}-01-01`)
        .lte("created_at", `${year}-12-31`);
      setOrders(data ?? []);

      // Google Sheets via API route
      try {
        const res = await fetch("/api/sheets");
        const json = await res.json();
        setRecetes((json.recetes ?? []).filter((r: any) => (r["Date"] ?? "").includes(yearShort)));
        setDepenses((json.depenses ?? []).filter((d: any) => (d["Date"] ?? "").includes(yearShort)));
      } catch (e) {
        console.error("Sheets error:", e);
      }
      setLoading(false);
    }
    load();
  }, [year, yearShort]);

  // Le CA plateforme = frais de service seulement (price_total - price_items)
  // Les achats (price_items) transitent vers le coursier, ne sont pas un revenu plateforme
  const platformRevenue = orders.reduce((s, o) => s + ((o.price_total ?? 0) - (o.price_items ?? 0)), 0);
  const totalItems = orders.reduce((s, o) => s + (o.price_items ?? 0), 0); // achats transmis au coursier
  const manualRevenue = recetes.reduce((s, r) => s + (parseFloat(r["Montant"] ?? "0") || 0), 0);
  const totalRevenue = platformRevenue + manualRevenue;
  const totalDepenses = depenses.reduce((s, d) => s + parseAmount(d["Montant TTC (€)"]), 0);
  const benefice = totalRevenue - totalDepenses;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <p className="text-gray-500 text-lg">Chargement du bilan {year}…</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-100 flex justify-center py-10 print:bg-white print:py-0">
      <div className="bg-white w-[800px] shadow-md p-10 print:shadow-none print:w-full">

        {/* Bouton impression */}
        <div className="flex justify-end mb-6 print:hidden">
          <button onClick={() => { setTimeout(() => window.print(), 300); }}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2 rounded-xl transition">
            📄 Imprimer / Sauvegarder PDF
          </button>
        </div>

        {/* EN-TÊTE */}
        <header className="flex items-start justify-between mb-8">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-chouette.png" alt="Il est Chouette" style={{ height: 70 }} />
          </div>
          <div className="text-right text-sm text-gray-600">
            <p className="font-bold text-gray-900 text-lg">Il est Chouette</p>
            <p>143 Promenade des Anglais</p>
            <p>06200 Nice, France</p>
            <p>SIREN : 942 069 949 — SASU</p>
          </div>
        </header>

        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Bilan d&apos;activité {year}</h1>
        <p className="text-center text-sm text-gray-500 mb-8">Du 1er janvier {year} au 31 décembre {year}</p>

        {/* RÉSUMÉ */}
        <section className="grid grid-cols-2 gap-4 mb-8">
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Recettes plateforme (frais de service)</p>
            <p className="text-2xl font-bold text-green-700">{fmtEuro(platformRevenue)}</p>
            <p className="text-xs text-gray-400 mt-1">{orders.length} commandes terminées</p>
          </div>
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Recettes manuelles</p>
            <p className="text-2xl font-bold text-blue-700">{fmtEuro(manualRevenue)}</p>
            <p className="text-xs text-gray-400 mt-1">{recetes.length} services réalisés</p>
          </div>
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Charges / Dépenses</p>
            <p className="text-2xl font-bold text-red-600">{fmtEuro(totalDepenses)}</p>
            <p className="text-xs text-gray-400 mt-1">{depenses.length} dépenses enregistrées</p>
          </div>
          <div className={`border-2 rounded-xl p-4 ${benefice >= 0 ? "border-orange-300 bg-orange-50" : "border-red-300 bg-red-50"}`}>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Bénéfice net</p>
            <p className={`text-2xl font-bold ${benefice >= 0 ? "text-orange-600" : "text-red-600"}`}>{fmtEuro(benefice)}</p>
            <p className="text-xs text-gray-400 mt-1">CA total : {fmtEuro(totalRevenue)}</p>
          </div>
          {totalItems > 0 && (
            <div className="col-span-2 border border-amber-200 bg-amber-50 rounded-xl p-4">
              <p className="text-xs text-amber-700 uppercase font-semibold mb-1">Achats avancés par les coursiers (non comptabilisés)</p>
              <p className="text-2xl font-bold text-amber-700">{fmtEuro(totalItems)}</p>
              <p className="text-xs text-amber-500 mt-1">Ces montants sont réglés directement par le client au coursier à la livraison — ils ne constituent pas un revenu plateforme.</p>
            </div>
          )}
        </section>

        {/* RECETTES PLATEFORME */}
        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4">Recettes plateforme (frais de service) — {fmtEuro(platformRevenue)}</h2>
          {orders.length === 0 ? <p className="text-sm text-gray-400">Aucune commande terminée en {year}.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="text-left py-2 px-2">Date</th>
                <th className="text-left py-2 px-2">Service</th>
                <th className="text-right py-2 px-2">Achats</th>
                <th className="text-right py-2 px-2">Frais service</th>
              </tr></thead>
              <tbody>
                {orders.map((o) => {
                  const serviceFee = (o.price_total ?? 0) - (o.price_items ?? 0);
                  return (
                    <tr key={o.id} className="border-b border-gray-50">
                      <td className="py-1.5 px-2 text-gray-500">{new Date(o.created_at).toLocaleDateString("fr-FR")}</td>
                      <td className="py-1.5 px-2 text-gray-700">{SERVICES[o.service_type] ?? o.service_type}</td>
                      <td className="py-1.5 px-2 text-right text-amber-600">{o.price_items ? fmtEuro(o.price_items) : "—"}</td>
                      <td className="py-1.5 px-2 text-right font-semibold">{fmtEuro(serviceFee)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr className="bg-gray-50 font-bold">
                <td colSpan={3} className="py-2 px-2">Total frais de service</td>
                <td className="py-2 px-2 text-right text-green-700">{fmtEuro(platformRevenue)}</td>
              </tr></tfoot>
            </table>
          )}
        </section>

        {/* RECETTES MANUELLES */}
        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4">Recettes manuelles (espèces) — {fmtEuro(manualRevenue)}</h2>
          {recetes.length === 0 ? <p className="text-sm text-gray-400">Aucune recette manuelle en {year}.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="text-left py-2 px-2">Date</th>
                <th className="text-left py-2 px-2">Client</th>
                <th className="text-left py-2 px-2">Service</th>
                <th className="text-left py-2 px-2">N° Facture</th>
                <th className="text-right py-2 px-2">Montant</th>
              </tr></thead>
              <tbody>
                {recetes.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1.5 px-2 text-gray-500">{r["Date"]}</td>
                    <td className="py-1.5 px-2 text-gray-700">{r["Client"]}</td>
                    <td className="py-1.5 px-2 text-gray-600">{r["Service réalisé"]}</td>
                    <td className="py-1.5 px-2 text-gray-500 text-xs">{r["N° de facture "]}</td>
                    <td className="py-1.5 px-2 text-right font-semibold text-blue-700">{fmtEuro(parseFloat(r["Montant"] ?? "0") || 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="bg-gray-50 font-bold">
                <td colSpan={4} className="py-2 px-2">Total recettes manuelles</td>
                <td className="py-2 px-2 text-right text-blue-700">{fmtEuro(manualRevenue)}</td>
              </tr></tfoot>
            </table>
          )}
        </section>

        {/* DÉPENSES */}
        <section className="mb-8">
          <h2 className="text-base font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4">Charges et dépenses — {fmtEuro(totalDepenses)}</h2>
          {depenses.length === 0 ? <p className="text-sm text-gray-400">Aucune dépense enregistrée en {year}.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="text-left py-2 px-2">Date</th>
                <th className="text-left py-2 px-2">Fournisseur</th>
                <th className="text-left py-2 px-2">Nature</th>
                <th className="text-left py-2 px-2">Paiement</th>
                <th className="text-right py-2 px-2">Montant TTC</th>
              </tr></thead>
              <tbody>
                {depenses.map((d, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1.5 px-2 text-gray-500">{d["Date"]}</td>
                    <td className="py-1.5 px-2 text-gray-700">{d["Fournisseur"]}</td>
                    <td className="py-1.5 px-2 text-gray-600">{d["Description / Nature de l'achat"]}</td>
                    <td className="py-1.5 px-2 text-gray-500">{d["Mode de paiement"]}</td>
                    <td className="py-1.5 px-2 text-right font-semibold text-red-600">{d["Montant TTC (€)"]}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="bg-gray-50 font-bold">
                <td colSpan={4} className="py-2 px-2">Total dépenses</td>
                <td className="py-2 px-2 text-right text-red-700">{fmtEuro(totalDepenses)}</td>
              </tr></tfoot>
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
