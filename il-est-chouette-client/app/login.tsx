import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { ORANGE, ORANGE_DARK, ORANGE_LIGHT, GRAY_700, GRAY_500, GRAY_300, RED, BG } from '@/constants/theme';

type Tab = 'email' | 'phone';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('email');

  // Email auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Phone auth
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleEmailLogin() {
    if (!email || !password) { setError(t('auth.error_credentials')); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (err) setError(t('auth.error_credentials'));
    setLoading(false);
  }

  async function handleSendOtp() {
    if (!phone) { setError(t('auth.error_generic')); return; }
    setLoading(true); setError('');
    const formattedPhone = phone.startsWith('+') ? phone : `+33${phone.replace(/^0/, '')}`;
    const { error: err } = await supabase.auth.signInWithOtp({ phone: formattedPhone });
    if (err) { setError(t('auth.error_generic')); }
    else { setOtpSent(true); }
    setLoading(false);
  }

  async function handleVerifyOtp() {
    if (!otp) return;
    setLoading(true); setError('');
    const formattedPhone = phone.startsWith('+') ? phone : `+33${phone.replace(/^0/, '')}`;
    const { error: err } = await supabase.auth.verifyOtp({ phone: formattedPhone, token: otp, type: 'sms' });
    if (err) setError(t('auth.error_otp'));
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={styles.header}>
          <Image source={require('@/assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Il est chouette</Text>
          <Text style={styles.subtitle}>{t('onboarding.tagline')}</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <Pressable style={[styles.tabBtn, tab === 'email' && styles.tabBtnActive]} onPress={() => { setTab('email'); setError(''); }}>
            <Text style={[styles.tabLabel, tab === 'email' && styles.tabLabelActive]}>📧 {t('auth.email')}</Text>
          </Pressable>
          <Pressable style={[styles.tabBtn, tab === 'phone' && styles.tabBtnActive]} onPress={() => { setTab('phone'); setError(''); }}>
            <Text style={[styles.tabLabel, tab === 'phone' && styles.tabLabelActive]}>📱 {t('auth.phone')}</Text>
          </Pressable>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {tab === 'email' ? (
            <>
              <Text style={styles.label}>{t('auth.email')}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="nom@exemple.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.label}>{t('auth.password')}</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable style={styles.btn} onPress={handleEmailLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('auth.login')}</Text>}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.label}>{t('auth.phone')}</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+33 6 12 34 56 78"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                editable={!otpSent}
              />
              {otpSent && (
                <>
                  <Text style={styles.label}>{t('auth.otp')}</Text>
                  <TextInput
                    style={styles.input}
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="123456"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </>
              )}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable
                style={styles.btn}
                onPress={otpSent ? handleVerifyOtp : handleSendOtp}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>{otpSent ? t('auth.verify') : t('auth.send_otp')}</Text>}
              </Pressable>
              {otpSent && (
                <Pressable onPress={() => { setOtpSent(false); setOtp(''); }} style={{ marginTop: 10, alignItems: 'center' }}>
                  <Text style={{ color: GRAY_500, fontSize: 13 }}>← Changer de numéro</Text>
                </Pressable>
              )}
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.no_account')} </Text>
          <Pressable onPress={() => router.push('/register')}>
            <Text style={styles.footerLink}>{t('auth.register')}</Text>
          </Pressable>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  inner: { padding: 24, paddingBottom: 48 },
  header: { alignItems: 'center', marginTop: 60, marginBottom: 32 },
  logo: { width: 80, height: 80, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: ORANGE },
  subtitle: { fontSize: 13, color: GRAY_500, marginTop: 4, textAlign: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  tabLabel: { fontSize: 13, fontWeight: '500', color: GRAY_500 },
  tabLabelActive: { color: ORANGE_DARK, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  label: { fontSize: 12, fontWeight: '600', color: GRAY_700, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#111827' },
  error: { color: RED, fontSize: 12, marginTop: 8, textAlign: 'center' },
  btn: { backgroundColor: ORANGE, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: GRAY_500, fontSize: 14 },
  footerLink: { color: ORANGE, fontWeight: '700', fontSize: 14 },
});
