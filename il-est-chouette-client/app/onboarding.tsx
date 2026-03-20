import { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { ORANGE, ORANGE_DARK, ORANGE_LIGHT, ORANGE_BORDER, GRAY_700, GRAY_500, BG } from '@/constants/theme';

const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [selected, setSelected] = useState(i18n.language ?? 'fr');

  async function handleContinue() {
    await i18n.changeLanguage(selected);
    await AsyncStorage.setItem('onboarding_done', 'true');
    await AsyncStorage.setItem('preferred_language', selected);
    router.replace('/login');
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.welcome}>{t('onboarding.welcome')}</Text>
        <Text style={styles.tagline}>{t('onboarding.tagline')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.chooseLang}>{t('onboarding.choose_lang')}</Text>
        <View style={styles.langList}>
          {LANGUAGES.map((l) => (
            <Pressable
              key={l.code}
              style={[styles.langBtn, selected === l.code && styles.langBtnActive]}
              onPress={() => setSelected(l.code)}
            >
              <Text style={styles.flag}>{l.flag}</Text>
              <Text style={[styles.langLabel, selected === l.code && styles.langLabelActive]}>
                {l.label}
              </Text>
              {selected === l.code && <Text style={styles.check}>✓</Text>}
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.btn} onPress={handleContinue}>
          <Text style={styles.btnText}>{t('onboarding.continue')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, justifyContent: 'center', padding: 24 },
  hero: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 100, height: 100, marginBottom: 16 },
  welcome: { fontSize: 30, fontWeight: '800', color: ORANGE, letterSpacing: 0.3 },
  tagline: { fontSize: 15, color: GRAY_500, marginTop: 6, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  chooseLang: { fontSize: 15, fontWeight: '600', color: GRAY_700, marginBottom: 16, textAlign: 'center' },
  langList: { gap: 10 },
  langBtn: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', gap: 12 },
  langBtnActive: { borderColor: ORANGE, backgroundColor: ORANGE_LIGHT },
  flag: { fontSize: 24 },
  langLabel: { flex: 1, fontSize: 16, fontWeight: '500', color: GRAY_700 },
  langLabelActive: { color: ORANGE_DARK, fontWeight: '700' },
  check: { fontSize: 18, color: ORANGE },
  btn: { backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },
});
