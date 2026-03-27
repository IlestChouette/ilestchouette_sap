import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_SECRET = Deno.env.get('STRIPE_SECRET_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? 'allo@ilestchouette.fr';

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
    const refundFailed: string[] = [];

    for (const order of expiredOrders) {
      // Rembourser Stripe si paiement en ligne (avec retry x2)
      if (order.stripe_payment_intent_id && STRIPE_SECRET) {
        let refundOk = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
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

          if (refundRes.ok) {
            refundOk = true;
            refunded++;
            break;
          }
          const err = await refundRes.json();
          console.error(`Stripe refund attempt ${attempt} failed for order ${order.id}:`, err);
          if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
        }

        if (!refundOk) {
          refundFailed.push(order.id);
          // Alerter l'admin par email
          if (RESEND_API_KEY) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'Il est Chouette <allo@ilestchouette.fr>',
                to: [ADMIN_EMAIL],
                subject: `⚠️ Échec remboursement Stripe — commande ${order.id}`,
                html: `<p>Le remboursement automatique a échoué après 3 tentatives.</p>
                       <p><strong>Commande :</strong> ${order.id}</p>
                       <p><strong>Montant :</strong> ${order.price_total} €</p>
                       <p><strong>Client :</strong> ${order.client_email ?? 'inconnu'}</p>
                       <p>Action manuelle requise sur le dashboard Stripe.</p>`,
              }),
            });
          }
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

      // Notifier le client par email
      if (order.client_email && RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Il est Chouette <allo@ilestchouette.fr>',
            to: [order.client_email],
            subject: 'Votre commande a été annulée',
            html: `<p>Bonjour,</p>
                   <p>Nous n'avons pas trouvé de coursier disponible pour votre commande dans les 20 minutes.</p>
                   <p>Votre commande a été annulée automatiquement.</p>
                   ${order.stripe_payment_intent_id ? '<p>Un remboursement complet a été initié et apparaîtra sous 5 à 10 jours ouvrés.</p>' : ''}
                   <p>Nous vous présentons nos excuses pour ce désagrément.</p>
                   <p>Vous pouvez repasser commande à tout moment sur <a href="https://www.ilestchouette.fr">ilestchouette.fr</a>.</p>
                   <p>L'équipe Il est Chouette</p>`,
          }),
        });
      }

      cancelled++;
    }

    console.log(`Auto-cancel: ${cancelled} annulées, ${refunded} remboursées, ${refundFailed.length} échecs remboursement`);

    return new Response(
      JSON.stringify({ cancelled, refunded, refundFailed }),
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
