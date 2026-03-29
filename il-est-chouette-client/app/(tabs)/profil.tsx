import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import type { Profile, SavedAddress } from '@/lib/types';
import { ORANGE, ORANGE_LIGHT, ORANGE_BORDER, GRAY_700, GRAY_500, GREEN, RED, BG } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGES = [
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
];

export default function ProfilScreen() {
  const { t } = useTranslation();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [addrLabel, setAddrLabel] = useState('');
  const [addrValue, setAddrValue] = useState('');
  const [savingAddr, setSavingAddr] = useState(false);

  const [newPass, setNewPass] = useState('');
  const [newPass2, setNewPass2] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState(i18n.language ?? 'fr');
  const [stats, setStats] = useState({ total: 0, done: 0, spent: 0 });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) { setLoading(false); return; }

    const email = sessionData.session?.user?.email ?? '';
    const [{ data: prof }, { data: addrs }, { data: orders }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('saved_addresses').select('*').eq('user_id', userId).order('created_at'),
      email ? supabase.from('orders').select('price_total, status').eq('client_email', email) : Promise.resolve({ data: [] }),
    ]);
    if (orders) {
      const done = orders.filter((o: any) => o.status === 'terminee');
      setStats({ total: orders.length, done: done.length, spent: done.reduce((s: number, o: any) => s + o.price_total, 0) });
    }

    if (prof) {
      setProfile(prof as Profile);
      setFullName(prof.full_name ?? '');
      setPhone(prof.phone ?? '');
      if (prof.preferred_language) {
        setLang(prof.preferred_language);
        await i18n.changeLanguage(prof.preferred_language);
      }
    }
    setAddresses((addrs ?? []) as SavedAddress[]);
    setLoading(false);
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) return;

    await supabase.from('profiles').upsert({
      id: userId,
      email: sessionData.session?.user?.email,
      full_name: fullName,
      phone,
      preferred_language: lang,
    });
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem('preferred_language', lang);
    setProfileMsg(t('profile.saved'));
    setSavingProfile(false);
    setTimeout(() => setProfileMsg(''), 2000);
  }

  async function handleAddAddress() {
    if (!addrLabel || !addrValue) return;
    setSavingAddr(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) return;
    await supabase.from('saved_addresses').insert({ user_id: userId, label: addrLabel, address: addrValue });
    setAddrLabel(''); setAddrValue('');
    setShowAddAddr(false);
    setSavingAddr(false);
    loadData();
  }

  async function handleDeleteAddress(id: string) {
    await supabase.from('saved_addresses').delete().eq('id', id);
    loadData();
  }

  async function handleChangePassword() {
    if (newPass.length < 6) { setPwdErr(t('register.error_password')); return; }
    if (newPass !== newPass2) { setPwdErr(t('register.error_confirm')); return; }
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) { setPwdErr(t('auth.error_generic')); }
    else { setPwdMsg(t('profile.password_updated')); setPwdErr(''); setNewPass(''); setNewPass2(''); }
  }

  async function handleLogout() {
    Alert.alert(t('auth.logout'), t('auth.logout_confirm'), [
      { text: t('auth.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'), style: 'destructive', onPress: async () => {
          // Effacer les données locales avant déconnexion
          await AsyncStorage.multiRemove(['skipped_orders', 'pending_service', 'onboarding_done']);
          await supabase.auth.signOut();
        }
      },
    ]);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={ORANGE} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.full_name ?? profile?.email ?? '?')[0].toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>{profile?.full_name || t('profile.title')}</Text>
            {profile?.email && <Text style={styles.headerSub}>{profile.email}</Text>}
          </View>
        </View>
        {stats.total > 0 && (
          <View style={styles.statsRow}>
            <StatPill emoji="📦" value={`${stats.total}`} label="commandes" />
            <StatPill emoji="✅" value={`${stats.done}`} label="livrées" />
            <StatPill emoji="💶" value={`${stats.spent.toFixed(0)} €`} label="dépensés" />
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Informations personnelles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 {t('profile.title')}</Text>

          <Text style={styles.label}>{t('profile.full_name')}</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Marie Dupont" placeholderTextColor="#9CA3AF" />

          <Text style={styles.label}>{t('profile.phone')}</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+33 6 12 34 56 78" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />

          {/* Langue */}
          <Text style={styles.label}>{t('profile.language')}</Text>
          <View style={styles.langRow}>
            {LANGUAGES.map((l) => (
              <Pressable
                key={l.code}
                style={[styles.langBtn, lang === l.code && styles.langBtnActive]}
                onPress={() => setLang(l.code)}
              >
                <Text style={styles.langFlag}>{l.flag}</Text>
                <Text style={[styles.langLabel, lang === l.code && styles.langLabelActive]}>{l.label}</Text>
              </Pressable>
            ))}
          </View>

          {profileMsg ? <Text style={styles.success}>{profileMsg}</Text> : null}
          <Pressable style={styles.saveBtn} onPress={handleSaveProfile} disabled={savingProfile}>
            {savingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{t('profile.save')}</Text>}
          </Pressable>
        </View>

        {/* Adresses sauvegardées */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📍 {t('profile.saved_addresses')}</Text>
            <Pressable style={styles.addBtn} onPress={() => setShowAddAddr((v) => !v)}>
              <Text style={styles.addBtnText}>{showAddAddr ? '✕' : t('profile.add_address')}</Text>
            </Pressable>
          </View>

          {showAddAddr && (
            <View style={styles.addForm}>
              <TextInput style={styles.input} value={addrLabel} onChangeText={setAddrLabel} placeholder={t('profile.address_label')} placeholderTextColor="#9CA3AF" />
              <TextInput style={styles.input} value={addrValue} onChangeText={setAddrValue} placeholder={t('profile.address_value')} placeholderTextColor="#9CA3AF" />
              <Pressable style={styles.saveBtn} onPress={handleAddAddress} disabled={savingAddr}>
                {savingAddr ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{t('profile.save')}</Text>}
              </Pressable>
            </View>
          )}

          {addresses.length === 0 && !showAddAddr && (
            <Text style={styles.emptyText}>Aucune adresse sauvegardée.</Text>
          )}

          {addresses.map((addr) => (
            <View key={addr.id} style={styles.addrRow}>
              <View style={styles.addrIcon}>
                <Text style={{ fontSize: 18 }}>📍</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addrLabel}>{addr.label}</Text>
                <Text style={styles.addrValue} numberOfLines={2}>{addr.address}</Text>
              </View>
              <Pressable onPress={() => handleDeleteAddress(addr.id)}>
                <Text style={{ fontSize: 18 }}>🗑</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {/* Mot de passe */}
        <View style={styles.section}>
          <Pressable style={styles.sectionHeader} onPress={() => setShowPwd((v) => !v)}>
            <Text style={styles.sectionTitle}>🔒 {t('profile.password_section')}</Text>
            <Text style={{ color: GRAY_500, fontSize: 14 }}>{showPwd ? '▲' : '▼'}</Text>
          </Pressable>
          {showPwd && (
            <View style={{ gap: 8, marginTop: 12 }}>
              <TextInput style={styles.input} value={newPass} onChangeText={setNewPass} placeholder={t('profile.new_password')} placeholderTextColor="#9CA3AF" secureTextEntry />
              <TextInput style={styles.input} value={newPass2} onChangeText={setNewPass2} placeholder={t('profile.confirm_password')} placeholderTextColor="#9CA3AF" secureTextEntry />
              {pwdErr ? <Text style={styles.error}>{pwdErr}</Text> : null}
              {pwdMsg ? <Text style={styles.success}>{pwdMsg}</Text> : null}
              <Pressable style={styles.saveBtn} onPress={handleChangePassword}>
                <Text style={styles.saveBtnText}>{t('profile.change_password')}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Déconnexion */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </Pressable>

      </ScrollView>
    </View>
  );
}

function StatPill({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  header: { backgroundColor: ORANGE, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  statPill: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', flex: 1 },
  statEmoji: { fontSize: 15 },
  statValue: { fontSize: 15, fontWeight: '800', color: '#fff', marginTop: 2 },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  section: { backgroundColor: '#fff', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, gap: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  label: { fontSize: 12, fontWeight: '600', color: GRAY_700, marginTop: 4 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#111827' },
  langRow: { flexDirection: 'row', gap: 8 },
  langBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  langBtnActive: { borderColor: ORANGE, backgroundColor: ORANGE_LIGHT },
  langFlag: { fontSize: 18 },
  langLabel: { fontSize: 12, fontWeight: '600', color: GRAY_700 },
  langLabelActive: { color: ORANGE },
  saveBtn: { backgroundColor: ORANGE, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  error: { color: RED, fontSize: 12 },
  success: { color: GREEN, fontSize: 12 },
  addBtn: { backgroundColor: ORANGE, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  addForm: { gap: 8, marginTop: 8 },
  emptyText: { fontSize: 13, color: GRAY_500, fontStyle: 'italic' },
  addrRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  addrIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: ORANGE_LIGHT, alignItems: 'center', justifyContent: 'center' },
  addrLabel: { fontSize: 13, fontWeight: '700', color: '#111827' },
  addrValue: { fontSize: 12, color: GRAY_500, marginTop: 2 },
  logoutBtn: { backgroundColor: '#FEE2E2', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: RED, fontWeight: '700', fontSize: 15 },
});
