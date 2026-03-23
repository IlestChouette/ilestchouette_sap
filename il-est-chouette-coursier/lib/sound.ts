import { Audio } from 'expo-av';

let soundObject: Audio.Sound | null = null;

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
  } catch (e) {
    console.error('Erreur lecture son mission:', e);
  }
}

export async function stopMissionSound(): Promise<void> {
  try {
    if (soundObject) {
      await soundObject.stopAsync();
      await soundObject.unloadAsync();
      soundObject = null;
    }
  } catch (e) {
    console.error('Erreur arrêt son mission:', e);
  }
}
