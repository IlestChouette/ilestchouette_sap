import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  try {
    const payload = await req.json();

    // Le webhook Supabase envoie { type, table, record, old_record }
    const { type, record } = payload;

    // On ne traite que les INSERT avec status = 'assigned'
    if (type !== 'INSERT' || record?.status !== 'assigned') {
      return new Response('ignored', { status: 200 });
    }

    const courierEmail: string = record.courier_email;
    const orderId: string = record.order_id;
    const assignmentId: string = record.id;

    if (!courierEmail) {
      return new Response('no courier_email', { status: 200 });
    }

    // Récupérer le push token du coursier
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('courier_email', courierEmail)
      .maybeSingle();

    if (tokenErr || !tokenRow?.token) {
      console.log('Pas de push token pour', courierEmail);
      return new Response('no token', { status: 200 });
    }

    // Récupérer les détails de la commande
    const { data: order } = await supabase
      .from('orders')
      .select('pickup_address, dropoff_address, price_total, express')
      .eq('id', orderId)
      .maybeSingle();

    const pickup = order?.pickup_address ?? 'Adresse inconnue';
    const price = order ? `${(order.price_total * 0.60).toFixed(2)} €` : '';
    const express = order?.express ? ' 🚨 EXPRESS' : '';

    // Envoyer la notification via l'API Expo Push
    const message = {
      to: tokenRow.token,
      sound: 'icq.mp3',
      title: `Nouvelle mission${express} 🚴`,
      body: `${pickup} → ${price}`,
      data: { order_id: orderId, assignment_id: assignmentId },
      channelId: 'missions',
      priority: 'high',
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Expo push result:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('notify-courier error:', err);
    return new Response(String(err), { status: 500 });
  }
});
