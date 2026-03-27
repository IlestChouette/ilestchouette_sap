import { useEffect, useRef } from 'react';
import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { playMissionSound } from '@/lib/sound';
import { useState } from 'react';

const isExpoGo = Constants.appOwnership === 'expo';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const notifListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Charger la session initiale
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Écouter les changements d'auth
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);

      // Quand le coursier se connecte → enregistrer le push token (pas sur Expo Go)
      if (s?.user?.email && !isExpoGo) {
        const token = await registerForPushNotifications();
        if (token) {
          await savePushToken(s.user.email, token);
        }
      }
    });

    // Notification reçue quand l'app est AU PREMIER PLAN → son en boucle
    if (!isExpoGo) {
      notifListener.current = Notifications.addNotificationReceivedListener(() => {
        playMissionSound();
      });

      // L'utilisateur TAPE sur une notification (arrière-plan ou fermée) → son en boucle
      responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
        playMissionSound();
      });
    }

    // ── Realtime : nouvelle commande "pending" (toutes sources) ──────────────
    // Ceci couvre les commandes venant de l'app client, du site opérateur,
    // ou de toute autre source — sans dépendre des push notifications.
    const SERVICE_LABELS: Record<string, string> = {
      supermarket: '🛒 Courses supermarché',
      meds: '💊 Pharmacie',
      food: '🍕 Livraison repas',
      keys: '🗝️ Clés / documents',
      shopping: '🛍️ Shopping',
      express: '⚡ Express urgent',
      voiturier: '🚗 Voiturier',
      it: '💻 Soutien informatique',
      assist: '🤝 Assistance',
      bricolage: '🔧 Bricolage',
    };

    const realtimeChannel = supabase
      .channel('new-orders-alert')
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'orders', filter: 'status=eq.pending' },
        async (payload: any) => {
          const order = payload.new;
          const serviceLabel = SERVICE_LABELS[order?.service_type] ?? order?.service_type ?? 'Nouvelle commande';

          // Jouer le son chouette
          playMissionSound();

          // Notification locale visible même si une push n'a pas été envoyée
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '🔔 Nouvelle commande disponible',
              body: `${serviceLabel} — ${order?.dropoff_address ?? ''}`,
              sound: true,
            },
            trigger: null, // immédiat
          });
        },
      )
      .subscribe();

    return () => {
      listener.subscription.unsubscribe();
      notifListener.current?.remove();
      responseListener.current?.remove();
      supabase.removeChannel(realtimeChannel);
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F8FF' }}>
        <ActivityIndicator size="large" color="#1B5E9B" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      {!session && <Redirect href="/login" />}
      <StatusBar style="auto" />
    </>
  );
}
