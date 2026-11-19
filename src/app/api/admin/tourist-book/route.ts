import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Clé Stripe restreinte (lecture seule « Charges »). Le compte Stripe est partagé avec Il est chouette :
// seuls les paiements d'abonnement (liés à une facture Stripe) viennent de Tourist Book,
// les commandes Il est chouette sont des PaymentIntents ponctuels sans facture.
const KEY = process.env.TOURIST_BOOK_STRIPE_KEY;

export async function GET(req: Request) {
  const jar = await cookies();
  const token = process.env.ADMIN_COOKIE_TOKEN;
  if (!token || jar.get("iec_admin_auth")?.value !== token) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!KEY) return NextResponse.json({ configured: false });

  const year = parseInt(new URL(req.url).searchParams.get("year") ?? "") || new Date().getFullYear();
  const from = Math.floor(Date.UTC(year, 0, 1) / 1000);
  const to = Math.floor(Date.UTC(year + 1, 0, 1) / 1000);

  let total = 0;
  let count = 0;
  const parMois: number[] = Array(12).fill(0);
  let after = "";
  // ponytail: pagination séquentielle, suffisant tant que le volume reste à quelques milliers de paiements/an
  for (;;) {
    const q = new URLSearchParams({ limit: "100", "created[gte]": String(from), "created[lt]": String(to) });
    if (after) q.set("starting_after", after);
    const r = await fetch(`https://api.stripe.com/v1/charges?${q}`, { headers: { Authorization: `Bearer ${KEY}` } });
    const d = await r.json();
    if (!r.ok) return NextResponse.json({ error: d.error?.message ?? "Erreur Stripe" }, { status: 502 });
    for (const c of d.data) {
      if (c.status !== "succeeded" || !c.paid || !c.invoice) continue;
      const net = (c.amount - c.amount_refunded) / 100;
      if (net <= 0) continue;
      total += net;
      count++;
      parMois[new Date(c.created * 1000).getUTCMonth()] += net;
    }
    if (!d.has_more) break;
    after = d.data[d.data.length - 1].id;
  }

  return NextResponse.json({ configured: true, year, total, count, parMois });
}
