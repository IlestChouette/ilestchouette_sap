import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const SHEET_ID = "1It-TOn5Caf8TYjnoc-4rCrMJv2lZE9q1eV4b7FYuAr4";
const ADMIN_COOKIE = "iec_admin_auth";

function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim());
  return lines.slice(1).map((line) => {
    // Handle quoted fields with commas inside
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += line[i];
      }
    }
    values.push(current.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
}

export async function GET() {
  // Vérifier que l'appelant est un admin authentifié
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  const adminToken = process.env.ADMIN_COOKIE_TOKEN;
  if (!adminToken || token !== adminToken) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const [recetesRes, depensesRes] = await Promise.all([
      fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=RECETES`),
      fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=DEPENSES`),
    ]);

    const [recetesCsv, depensesCsv] = await Promise.all([
      recetesRes.text(),
      depensesRes.text(),
    ]);

    const recetes = parseCsv(recetesCsv);
    const depenses = parseCsv(depensesCsv);

    return NextResponse.json({ recetes, depenses });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
