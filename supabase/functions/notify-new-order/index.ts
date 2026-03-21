import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_KEY = Deno.env.get("RESEND_API_KEY")!;
const ADMIN_EMAIL = "allo@ilestchouette.fr";

const SERVICE_LABELS: Record<string, string> = {
  supermarket: "🛒 Courses supermarché",
  meds: "💊 Pharmacie",
  food: "🍕 Livraison repas",
  keys: "🗝️ Clés / documents",
  shopping: "🛍️ Shopping",
  express: "⚡ Express",
  voiturier: "🚗 Voiturier",
  it: "💻 Soutien informatique",
  assist: "🤝 Assistance",
  bricolage: "🔧 Bricolage",
};

const PAYMENT_LABELS: Record<string, string> = {
  online_card: "💳 Carte en ligne (payé)",
  on_site_cash: "💵 Espèces à la livraison",
  on_site_card: "📲 Carte à la livraison",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const order = await req.json();

    const service = SERVICE_LABELS[order.service_type] ?? order.service_type ?? "—";
    const payment = PAYMENT_LABELS[order.payment_method] ?? order.payment_method ?? "—";
    const pickup = order.pickup_address ?? "Non précisé";
    const dropoff = order.dropoff_address ?? "—";
    const notes = order.notes ?? "Aucune note";
    const price = Number(order.price_total ?? 0).toFixed(2);
    const client = order.client_email ?? "Client non connecté";
    const scheduled = order.scheduled_at
      ? new Date(order.scheduled_at).toLocaleString("fr-FR")
      : "⚡ Dès que possible";

    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee">
        <div style="background:#F97316;padding:24px 28px">
          <h1 style="color:#fff;margin:0;font-size:22px">🦉 Nouvelle commande !</h1>
          <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px">Il est chouette — Nice</p>
        </div>
        <div style="padding:24px 28px">
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:8px 0;color:#6B7280;width:40%">Service</td><td style="font-weight:600">${service}</td></tr>
            <tr><td style="padding:8px 0;color:#6B7280">Client</td><td>${client}</td></tr>
            <tr><td style="padding:8px 0;color:#6B7280">Depuis</td><td>${pickup}</td></tr>
            <tr><td style="padding:8px 0;color:#6B7280">Livraison</td><td style="font-weight:600">${dropoff}</td></tr>
            <tr><td style="padding:8px 0;color:#6B7280">Détails</td><td>${notes}</td></tr>
            <tr><td style="padding:8px 0;color:#6B7280">Horaire</td><td>${scheduled}</td></tr>
            <tr><td style="padding:8px 0;color:#6B7280">Paiement</td><td>${payment}</td></tr>
          </table>
          <div style="background:#FFF7ED;border-radius:8px;padding:16px;margin-top:16px;text-align:center">
            <p style="margin:0;color:#9A3412;font-size:13px">Total</p>
            <p style="margin:4px 0 0;font-size:28px;font-weight:800;color:#F97316">${price} €</p>
          </div>
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Il est chouette <commandes@ilestchouette.fr>",
        to: [ADMIN_EMAIL],
        subject: `🦉 Nouvelle commande — ${service} — ${price} €`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
