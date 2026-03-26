import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  const N = require('expo-notifications');
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (isExpoGo || !Device.isDevice) return null;

  const N = require('expo-notifications');

  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync('orders', {
      name: 'Mes commandes',
      importance: N.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F97316',
    });
  }

  const { status: existing } = await N.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await N.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  try {
    const token = await N.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}

export async function saveClientPushToken(userId: string, token: string) {
  await supabase.from('client_push_tokens').upsert(
    { user_id: userId, token },
    { onConflict: 'user_id' },
  );
}
