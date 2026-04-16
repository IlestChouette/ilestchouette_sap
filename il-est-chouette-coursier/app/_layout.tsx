import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { playMissionSound, stopMissionSound } from '@/lib/sound';

const isExpoGo = Constants.appOwnership === 'expo';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const notifListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const router = useRouter();
  const segments = useSegments();

  // Navigation basée sur session
  useEffect(() => {
    if (loading) return;
    const inTabs = segments[0] === '(tabs)';
    if (session && !inTabs) {
      router.replace('/(tabs)');
    } else if (!session && inTabs) {
      router.replace('/login');
    }
  }, [session, loading]);

  useEffect(() => {
    // Charger la session initiale
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      // Enregistrer le push token au démarrage si déjà connecté
      // (le SIGNED_IN event ne se déclenche pas pour les sessions existantes)
      if (data.session?.user?.email && !isExpoGo) {
        registerForPushNotifications().then((token) => {
          if (token) savePushToken(data.session!.user!.email!, token);
        });
      }
    });

    // Écouter les changements d'auth
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);

      if (event === 'SIGNED_IN' && s?.user?.email && !isExpoGo) {
        const token = await registerForPushNotifications();
        if (token) await savePushToken(s.user.email, token);
      }
    });

    if (!isExpoGo) {
      // Ne PAS jouer le son ici quand la push arrive en foreground :
      // le Realtime le fait déjà immédiatement → évite le double son retardé.
      // notifListener intentionnellement vide.
      notifListener.current = Notifications.addNotificationReceivedListener(() => {
        // Son déjà géré par Realtime en foreground — ne rien faire
      });

      // L'utilisateur TAPE sur une notification depuis l'arrière-plan ou app fermée
      // → jouer le son seulement si une mission est encore en attente
      responseListener.current = Notifications.addNotificationResponseReceivedListener(async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const email = sessionData.session?.user?.email;
        if (!email) return;
        const { data } = await supabase
          .from('assignments')
          .select('id')
          .eq('courier_email', email)
          .eq('status', 'assigned')
          .limit(1);
        if (data && data.length > 0) {
          playMissionSound();
        }
      });
    }

    // ── AppState : quand l'app revient au premier plan, vérifier les nouvelles missions ──
    const handleAppStateChange = async (nextState: string) => {
      if (nextState === 'active') {
        const { data: sessionData } = await supabase.auth.getSession();
        const email = sessionData.session?.user?.email;
        if (!email) return;
        const { data } = await supabase
          .from('assignments')
          .select('id')
          .eq('courier_email', email)
          .eq('status', 'assigned')
          .limit(1);
        if (data && data.length > 0) {
          playMissionSound();
        } else {
          stopMissionSound();
        }
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    // ── Realtime : nouvelle commande "pending" (toutes sources) ──────────────
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
      appStateSub.remove();
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
      <StatusBar style="auto" />
    </>
  );
}
