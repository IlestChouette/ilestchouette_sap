const STRIPE_SECRET = Deno.env.get('STRIPE_SECRET_KEY')!;
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { amount, currency = 'eur' } = await req.json();

    const amountInt = Math.round(Number(amount));

    if (
      !amount ||
      typeof amount !== 'number' ||
      isNaN(amountInt) ||
      amountInt < 50 ||       // minimum 0.50 €
      amountInt > 50000        // maximum 500.00 €
    ) {
      return new Response(JSON.stringify({ error: 'Montant invalide (entre 0.50 € et 500.00 €)' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Créer le PaymentIntent Stripe
    const body = new URLSearchParams({
      amount: String(amountInt),
      currency,
      'automatic_payment_methods[enabled]': 'true',
    });

    const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const intent = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error('Stripe error:', intent);
      return new Response(JSON.stringify({ error: intent.error?.message ?? 'Erreur Stripe' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ clientSecret: intent.client_secret, paymentIntentId: intent.id }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('create-payment-intent error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
