import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { payment_intent_id, amount_cents, order_id, price_items_actual } = await req.json();

    if (!payment_intent_id || !amount_cents || !order_id) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // 1. Capturer le PaymentIntent Stripe avec le montant réel
    const stripeRes = await fetch(
      `https://api.stripe.com/v1/payment_intents/${payment_intent_id}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ amount_to_capture: String(amount_cents) }).toString(),
      }
    );

    const stripeData = await stripeRes.json();
    if (!stripeRes.ok) {
      return new Response(JSON.stringify({ error: stripeData.error?.message ?? "Erreur Stripe" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // 2. Mettre à jour la commande avec le montant réel
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        price_items_actual: price_items_actual ?? null,
        price_total: amount_cents / 100,
        payment_status: "captured",
      })
      .eq("id", order_id);

    if (updateError) {
      console.error("Supabase update error:", updateError);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
