import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_SECRET = Deno.env.get('STRIPE_SECRET_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Vérifier le secret cron
  const cronSecret = req.headers.get('x-cron-secret');
  if (!cronSecret || cronSecret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers: CORS });
  }

  try {
    // Trouver toutes les commandes pending depuis plus de 20 minutes
    const cutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString();

    const { data: expiredOrders, error } = await supabase
      .from('orders')
      .select('id, stripe_payment_intent_id, price_total, client_email')
      .eq('status', 'pending')
      .lt('created_at', cutoff);

    if (error) throw error;
    if (!expiredOrders || expiredOrders.length === 0) {
      return new Response(JSON.stringify({ cancelled: 0 }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    let cancelled = 0;
    let refunded = 0;

    for (const order of expiredOrders) {
      // Rembourser Stripe si paiement en ligne
      if (order.stripe_payment_intent_id && STRIPE_SECRET) {
        const refundRes = await fetch('https://api.stripe.com/v1/refunds', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${STRIPE_SECRET}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            payment_intent: order.stripe_payment_intent_id,
            reason: 'requested_by_customer',
          }).toString(),
        });

        if (refundRes.ok) refunded++;
        else {
          const err = await refundRes.json();
          console.error('Stripe refund error:', err);
        }
      }

      // Annuler la commande
      await supabase
        .from('orders')
        .update({
          status: 'annulee',
          cancellation_reason: 'no_courier',
        })
        .eq('id', order.id);

      cancelled++;
    }

    console.log(`Auto-cancel: ${cancelled} annulées, ${refunded} remboursées`);

    return new Response(
      JSON.stringify({ cancelled, refunded }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('auto-cancel-orders error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
