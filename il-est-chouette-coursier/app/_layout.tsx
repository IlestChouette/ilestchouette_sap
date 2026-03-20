import { useEffect, useRef } from 'react';
import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { playMissionSound } from '@/lib/sound';
import { useState } from 'react';

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

      // Quand le coursier se connecte → enregistrer le push token
      if (s?.user?.email) {
        const token = await registerForPushNotifications();
        if (token) {
          await savePushToken(s.user.email, token);
        }
      }
    });

    // Notification reçue quand l'app est AU PREMIER PLAN → son en boucle
    notifListener.current = Notifications.addNotificationReceivedListener(() => {
      playMissionSound();
    });

    // L'utilisateur TAPE sur une notification (arrière-plan ou fermée) → son en boucle
    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
      playMissionSound();
    });

    return () => {
      listener.subscription.unsubscribe();
      notifListener.current?.remove();
      responseListener.current?.remove();
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
