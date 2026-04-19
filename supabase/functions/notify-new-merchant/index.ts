import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_KEY = Deno.env.get("RESEND_API_KEY")!;
const ADMIN_EMAIL = "allo@ilestchouette.fr";

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
    const merchant = await req.json();

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Il est chouette <allo@ilestchouette.fr>",
        to: [ADMIN_EMAIL],
        subject: `🏪 Nouvelle inscription commerçant — ${merchant.name}`,
        html: `
          <h2>Nouvelle inscription commerçant</h2>
          <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px;">
            <tr><td style="padding:8px;color:#666">Commerce</td><td style="padding:8px;font-weight:bold">${merchant.name}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;color:#666">Catégorie</td><td style="padding:8px">${merchant.category}</td></tr>
            <tr><td style="padding:8px;color:#666">Email</td><td style="padding:8px">${merchant.email}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;color:#666">Téléphone</td><td style="padding:8px">${merchant.phone}</td></tr>
            <tr><td style="padding:8px;color:#666">Adresse</td><td style="padding:8px">${merchant.address}</td></tr>
            ${merchant.siret ? `<tr style="background:#f9f9f9"><td style="padding:8px;color:#666">SIRET</td><td style="padding:8px">${merchant.siret}</td></tr>` : ""}
            ${merchant.opening_hours ? `<tr><td style="padding:8px;color:#666">Horaires</td><td style="padding:8px">${merchant.opening_hours}</td></tr>` : ""}
          </table>
          <p style="margin-top:20px;">
            <a href="https://ilestchouette.fr/admin" style="background:#f97316;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
              Valider dans l'admin
            </a>
          </p>
        `,
      }),
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
