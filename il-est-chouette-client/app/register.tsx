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
import { ORANGE, GRAY_700, GRAY_500, RED, GREEN, BG } from '@/constants/theme';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleRegister() {
    setError('');
    if (!fullName.trim()) { setError(t('register.error_name')); return; }
    if (!email.includes('@')) { setError(t('register.error_email')); return; }
    if (!phone.trim()) { setError(t('register.error_phone')); return; }
    if (password.length < 6) { setError(t('register.error_password')); return; }
    if (password !== confirm) { setError(t('register.error_confirm')); return; }

    setLoading(true);
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: fullName.trim(), phone: phone.trim() },
      },
    });

    if (signUpErr) {
      setError(signUpErr.message);
      setLoading(false);
      return;
    }

    // Créer le profil dans la table profiles
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        phone: phone.trim(),
        preferred_language: 'fr',
      });
    }

    setSuccess(t('register.success'));
    setLoading(false);
    // Supabase connecte automatiquement l'utilisateur après signUp
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← {t('auth.login')}</Text>
          </Pressable>
          <Image source={require('@/assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>{t('register.title')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t('register.full_name')}</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder={t('register.full_name_ph')} placeholderTextColor="#9CA3AF" autoCapitalize="words" />

          <Text style={styles.label}>{t('register.email')}</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="nom@exemple.com" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>{t('register.phone')}</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder={t('register.phone_ph')} placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />

          <Text style={styles.label}>{t('register.password')}</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder={t('register.password_ph')} placeholderTextColor="#9CA3AF" secureTextEntry />

          <Text style={styles.label}>{t('register.confirm')}</Text>
          <TextInput style={styles.input} value={confirm} onChangeText={setConfirm} placeholder="••••••••" placeholderTextColor="#9CA3AF" secureTextEntry />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}

          <Pressable style={styles.btn} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('register.submit')}</Text>}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.already_account')} </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.footerLink}>{t('auth.login')}</Text>
          </Pressable>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  inner: { padding: 24, paddingBottom: 48 },
  header: { alignItems: 'center', marginTop: 60, marginBottom: 28 },
  back: { position: 'absolute', left: 0, top: 0 },
  backText: { color: ORANGE, fontSize: 14, fontWeight: '600' },
  logo: { width: 60, height: 60, marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  label: { fontSize: 12, fontWeight: '600', color: GRAY_700, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#111827' },
  error: { color: RED, fontSize: 12, marginTop: 10, textAlign: 'center' },
  success: { color: GREEN, fontSize: 13, marginTop: 10, textAlign: 'center' },
  btn: { backgroundColor: ORANGE, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: GRAY_500, fontSize: 14 },
  footerLink: { color: ORANGE, fontWeight: '700', fontSize: 14 },
});
