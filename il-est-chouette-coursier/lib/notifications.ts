import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Comment l'app affiche les notifications quand elle est au premier plan
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Demande la permission et retourne le push token Expo.
 * Retourne null si refus ou appareil non compatible.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Les push ne fonctionnent que sur un vrai appareil (pas simulateur)
  if (!Device.isDevice) {
    console.log('Push notifications : uniquement sur appareil physique.');
    return null;
  }

  // Vérifier / demander la permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permission notifications refusée.');
    return null;
  }

  // Canal Android obligatoire
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('missions', {
      name: 'Nouvelles missions',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#1B5E9B',
      sound: 'icq.mp3',
    });
  }

  // Récupérer le token Expo Push
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  });

  return tokenData.data;
}

/**
 * Sauvegarde le push token dans Supabase (table push_tokens).
 * Si le token existe déjà pour cet email, on le met à jour.
 */
export async function savePushToken(email: string, token: string): Promise<void> {
  await supabase
    .from('push_tokens')
    .upsert(
      { courier_email: email, token, updated_at: new Date().toISOString() },
      { onConflict: 'courier_email' }
    );
}
