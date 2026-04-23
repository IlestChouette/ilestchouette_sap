import '@/lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { Stack, Redirect, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { registerForPushNotifications, saveClientPushToken } from '@/lib/notifications';
import { ORANGE, BG } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isExpoGo = Constants.appOwnership === 'expo';

const STRIPE_PK = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!;
const ONBOARDING_KEY = 'onboarding_done';

export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const notifListener = useRef<{ remove: () => void } | null>(null);
  const pathname = usePathname();

  // Re-check onboardingDone when user navigates away from onboarding
  useEffect(() => {
    if (pathname !== '/onboarding' && !onboardingDone) {
      AsyncStorage.getItem(ONBOARDING_KEY).then(done => {
        if (done === 'true') setOnboardingDone(true);
      });
    }
  }, [pathname]);

  useEffect(() => {
    async function init() {
      const [{ data }, done] = await Promise.all([
        supabase.auth.getSession(),
        AsyncStorage.getItem(ONBOARDING_KEY),
      ]);
      setSession(data.session);
      setOnboardingDone(done === 'true');
      setLoading(false);
    }
    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s?.user?.id && !isExpoGo) {
        const token = await registerForPushNotifications();
        if (token) await saveClientPushToken(s.user.id, token);
      }
    });

    if (!isExpoGo) {
      const N = require('expo-notifications');
      notifListener.current = N.addNotificationReceivedListener(() => {});
    }

    return () => {
      listener.subscription.unsubscribe();
      notifListener.current?.remove();
    };
  }, []);

  if (loading || onboardingDone === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG }}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  return (
    <StripeProvider publishableKey={STRIPE_PK} merchantIdentifier="merchant.fr.ilestchouette">
      <>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        {!onboardingDone ? <Redirect href="/onboarding" /> : null}
        {onboardingDone && !session && pathname !== '/register' ? <Redirect href="/login" /> : null}
        <StatusBar style="dark" />
      </>
    </StripeProvider>
  );
}
