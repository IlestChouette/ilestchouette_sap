import { Audio } from 'expo-av';

let soundObject: Audio.Sound | null = null;
let autoStopTimer: ReturnType<typeof setTimeout> | null = null;

const AUTO_STOP_MS = 90_000; // Arrêt automatique après 90 secondes

export async function playMissionSound(): Promise<void> {
  try {
    // Activer l'audio même en mode silencieux (iOS)
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
    });

    // Stopper le son précédent s'il tourne encore
    if (soundObject) {
      await soundObject.stopAsync();
      await soundObject.unloadAsync();
      soundObject = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sounds/owl.wav'),
      { isLooping: true, volume: 1.0 }
    );

    soundObject = sound;
    await soundObject.playAsync();

    // Arrêt automatique après 90s si le coursier n'interagit pas
    if (autoStopTimer) clearTimeout(autoStopTimer);
    autoStopTimer = setTimeout(() => stopMissionSound(), AUTO_STOP_MS);
  } catch (e) {
    console.error('Erreur lecture son mission:', e);
  }
}

export async function stopMissionSound(): Promise<void> {
  try {
    if (autoStopTimer) {
      clearTimeout(autoStopTimer);
      autoStopTimer = null;
    }
    if (soundObject) {
      await soundObject.stopAsync();
      await soundObject.unloadAsync();
      soundObject = null;
    }
  } catch (e) {
    console.error('Erreur arrêt son mission:', e);
  }
}
