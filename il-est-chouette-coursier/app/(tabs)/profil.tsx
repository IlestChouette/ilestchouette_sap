import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { stopMissionSound } from '@/lib/sound';
import type { Availability } from '@/lib/types';

const BLUE = '#1B5E9B';
const GREEN = '#16A34A';
const RED = '#DC2626';

function formatRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const day = s.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
  const h1 = s.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const h2 = e.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${day}  ${h1} → ${h2}`;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0min';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}min`;
  return `${m}min`;
}

function formatPickerDate(d: Date) {
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

/* ---- Bouton d'ouverture du picker ---- */
function DatePickerButton({
  label,
  value,
  onPress,
}: {
  label: string;
  value: Date | null;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.pickerBtn} onPress={onPress}>
      <Text style={styles.pickerBtnLabel}>{label}</Text>
      <Text style={[styles.pickerBtnValue, !value && styles.pickerBtnPlaceholder]}>
        {value ? formatPickerDate(value) : 'Sélectionner…'}
      </Text>
      <Text style={styles.pickerArrow}>📅</Text>
    </Pressable>
  );
}

export default function ProfilScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekSeconds, setWeekSeconds] = useState(0);
  const [monthSeconds, setMonthSeconds] = useState(0);
  const [weekMissions, setWeekMissions] = useState(0);
  const [monthMissions, setMonthMissions] = useState(0);
  const [weekEarnings, setWeekEarnings] = useState(0);
  const [monthEarnings, setMonthEarnings] = useState(0);
  const [adding, setAdding] = useState(false);
  const [savingAvail, setSavingAvail] = useState(false);
  const [availErr, setAvailErr] = useState('');

  // Dates sélectionnées
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Quel picker est ouvert : 'start-date' | 'start-time' | 'end-date' | 'end-time' | null
  type PickerStep = 'start-date' | 'start-time' | 'end-date' | 'end-time' | null;
  const [pickerStep, setPickerStep] = useState<PickerStep>(null);

  // Valeur temporaire du picker (pour iOS inline)
  const [tempDate, setTempDate] = useState(new Date());

  const [newPass, setNewPass] = useState('');
  const [newPass2, setNewPass2] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: sessionData } = await supabase.auth.getSession();
    const userEmail = sessionData.session?.user?.email ?? '';
    setEmail(userEmail);

    const { data } = await supabase
      .from('availabilities')
      .select('*')
      .eq('courier_email', userEmail)
      .gte('end', new Date().toISOString())
      .order('start', { ascending: true });

    if (data) setAvailabilities(data as Availability[]);

    // Charger les stats de trajet
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: stats } = await supabase
      .from('assignments')
      .select('route_duration_seconds,assigned_at,order:orders(price_total)')
      .eq('courier_email', userEmail)
      .eq('status', 'terminee');

    if (stats) {
      let wSecs = 0, mSecs = 0, wCount = 0, mCount = 0, wEarn = 0, mEarn = 0;
      for (const s of stats) {
        const d = new Date(s.assigned_at);
        const price = (s.order as { price_total?: number } | null)?.price_total ?? 0;
        if (d >= startOfMonth) { if (s.route_duration_seconds) mSecs += s.route_duration_seconds; mCount++; mEarn += price; }
        if (d >= startOfWeek) { if (s.route_duration_seconds) wSecs += s.route_duration_seconds; wCount++; wEarn += price; }
      }
      setWeekSeconds(wSecs);
      setMonthSeconds(mSecs);
      setWeekMissions(wCount);
      setMonthMissions(mCount);
      setWeekEarnings(wEarn);
      setMonthEarnings(mEarn);
    }

    setLoading(false);
  }

  /* ---- Gestion du picker ---- */
  function openPicker(step: PickerStep, base?: Date) {
    setTempDate(base ?? new Date());
    setPickerStep(step);
  }

  function onPickerChange(event: DateTimePickerEvent, selected?: Date) {
    if (!selected) { setPickerStep(null); return; }

    // Android : dismiss + apply immédiatement
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') { setPickerStep(null); return; }

      if (pickerStep === 'start-date') {
        const d = selected;
        setTempDate(d);
        setTimeout(() => openPicker('start-time', d), 500);
      } else if (pickerStep === 'start-time') {
        const merged = mergeDateAndTime(tempDate, selected);
        setStartDate(merged);
        setPickerStep(null);
      } else if (pickerStep === 'end-date') {
        const d = selected;
        setTempDate(d);
        setTimeout(() => openPicker('end-time', d), 500);
      } else if (pickerStep === 'end-time') {
        const merged = mergeDateAndTime(tempDate, selected);
        setEndDate(merged);
        setPickerStep(null);
      }
    } else {
      // iOS : inline, on met à jour tempDate en direct
      setTempDate(selected);
    }
  }

  // Confirmation iOS (bouton "Valider" sous le picker)
  function confirmIOSPicker() {
    if (pickerStep === 'start-date') {
      setTempDate(tempDate);
      setPickerStep('start-time');
    } else if (pickerStep === 'start-time') {
      const merged = mergeDateAndTime(startDate ?? tempDate, tempDate);
      setStartDate(merged);
      setPickerStep(null);
    } else if (pickerStep === 'end-date') {
      setTempDate(tempDate);
      setPickerStep('end-time');
    } else if (pickerStep === 'end-time') {
      const merged = mergeDateAndTime(endDate ?? tempDate, tempDate);
      setEndDate(merged);
      setPickerStep(null);
    }
  }

  function mergeDateAndTime(dateRef: Date, timeRef: Date): Date {
    const d = new Date(dateRef);
    d.setHours(timeRef.getHours(), timeRef.getMinutes(), 0, 0);
    return d;
  }

  function pickerTitle() {
    switch (pickerStep) {
      case 'start-date': return 'Début — Choisir le jour';
      case 'start-time': return 'Début — Choisir l\'heure';
      case 'end-date': return 'Fin — Choisir le jour';
      case 'end-time': return 'Fin — Choisir l\'heure';
      default: return '';
    }
  }

  /* ---- Sauvegarder la disponibilité ---- */
  async function handleAddAvailability() {
    if (!startDate || !endDate) {
      setAvailErr('Sélectionne le début et la fin.');
      return;
    }
    if (startDate >= endDate) {
      setAvailErr('La fin doit être après le début.');
      return;
    }
    setSavingAvail(true);
    const { error } = await supabase
      .from('availabilities')
      .insert({ courier_email: email, start: startDate.toISOString(), end: endDate.toISOString() });

    if (error) {
      setAvailErr('Erreur lors de l\'enregistrement.');
    } else {
      setStartDate(null);
      setEndDate(null);
      setAvailErr('');
      setAdding(false);
      loadData();
    }
    setSavingAvail(false);
  }

  async function handleDeleteAvailability(id: string) {
    await supabase.from('availabilities').delete().eq('id', id);
    loadData();
  }

  async function handleChangePassword() {
    if (newPass.length < 6) { setPwdErr('Minimum 6 caractères.'); return; }
    if (newPass !== newPass2) { setPwdErr('Les mots de passe ne correspondent pas.'); return; }
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) {
      setPwdErr('Erreur lors du changement.');
    } else {
      setPwdMsg('Mot de passe mis à jour !');
      setPwdErr('');
      setNewPass('');
      setNewPass2('');
    }
  }

  async function handleLogout() {
    Alert.alert('Déconnexion', 'Veux-tu vraiment te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter', style: 'destructive', onPress: async () => {
          await stopMissionSound();
          await supabase.auth.signOut();
          router.replace('/login');
        }
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={BLUE} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F0F8FF' }}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Mon profil</Text>
        <Text style={styles.screenSubtitle}>{email}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Stats de trajet */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statPeriod}>Cette semaine</Text>
            <Text style={styles.statTime}>{formatDuration(weekSeconds)}</Text>
            <Text style={styles.statEarnings}>{weekEarnings.toFixed(2)} €</Text>
            <Text style={styles.statMissions}>{weekMissions} mission{weekMissions > 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statPeriod}>Ce mois</Text>
            <Text style={styles.statTime}>{formatDuration(monthSeconds)}</Text>
            <Text style={styles.statEarnings}>{monthEarnings.toFixed(2)} €</Text>
            <Text style={styles.statMissions}>{monthMissions} mission{monthMissions > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Disponibilités */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mes disponibilités</Text>
            <Pressable style={styles.addBtn} onPress={() => { setAdding(!adding); setAvailErr(''); }}>
              <Text style={styles.addBtnText}>{adding ? '✕ Annuler' : '+ Ajouter'}</Text>
            </Pressable>
          </View>

          {adding && (
            <View style={styles.addForm}>
              <DatePickerButton
                label="Début"
                value={startDate}
                onPress={() => openPicker('start-date', startDate ?? new Date())}
              />
              <DatePickerButton
                label="Fin"
                value={endDate}
                onPress={() => openPicker('end-date', endDate ?? startDate ?? new Date())}
              />

              {availErr ? <Text style={styles.error}>{availErr}</Text> : null}

              <Pressable
                style={[styles.saveBtn, (!startDate || !endDate) && styles.saveBtnDisabled]}
                onPress={handleAddAvailability}
                disabled={savingAvail || !startDate || !endDate}
              >
                {savingAvail
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Enregistrer</Text>}
              </Pressable>
            </View>
          )}

          {availabilities.length === 0 && !adding ? (
            <Text style={styles.emptyText}>Aucune disponibilité enregistrée.</Text>
          ) : (
            availabilities.map((av) => (
              <View key={av.id} style={styles.availRow}>
                <Text style={styles.availText}>{formatRange(av.start, av.end)}</Text>
                <Pressable onPress={() => handleDeleteAvailability(av.id)}>
                  <Text style={styles.deleteBtn}>🗑</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        {/* Mot de passe */}
        <View style={styles.section}>
          <Pressable style={styles.sectionHeader} onPress={() => setShowPwd(!showPwd)}>
            <Text style={styles.sectionTitle}>Mot de passe</Text>
            <Text style={styles.chevron}>{showPwd ? '▲' : '▼'}</Text>
          </Pressable>
          {showPwd && (
            <View>
              <Text style={styles.label}>Nouveau mot de passe</Text>
              <TextInput style={styles.input} value={newPass} onChangeText={setNewPass} placeholder="••••••••" placeholderTextColor="#9CA3AF" secureTextEntry />
              <Text style={styles.label}>Confirmer</Text>
              <TextInput style={styles.input} value={newPass2} onChangeText={setNewPass2} placeholder="••••••••" placeholderTextColor="#9CA3AF" secureTextEntry />
              {pwdErr ? <Text style={styles.error}>{pwdErr}</Text> : null}
              {pwdMsg ? <Text style={styles.success}>{pwdMsg}</Text> : null}
              <Pressable style={styles.saveBtn} onPress={handleChangePassword}>
                <Text style={styles.saveBtnText}>Changer le mot de passe</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Déconnexion</Text>
        </Pressable>
      </ScrollView>

      {/* ---- Picker natif ---- */}
      {pickerStep !== null && (
        <>
          {/* Overlay iOS avec titre + bouton valider */}
          {Platform.OS === 'ios' && (
            <View style={styles.iosOverlay}>
              <View style={styles.iosModal}>
                <View style={styles.iosModalHeader}>
                  <Pressable onPress={() => setPickerStep(null)}>
                    <Text style={styles.iosCancel}>Annuler</Text>
                  </Pressable>
                  <Text style={styles.iosTitle}>{pickerTitle()}</Text>
                  <Pressable onPress={confirmIOSPicker}>
                    <Text style={styles.iosConfirm}>Suivant →</Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={tempDate}
                  mode={pickerStep.endsWith('time') ? 'time' : 'date'}
                  display="spinner"
                  onChange={onPickerChange}
                  locale="fr-FR"
                  minuteInterval={15}
                  minimumDate={pickerStep.startsWith('end') ? (startDate ?? new Date()) : new Date()}
                  themeVariant="light"
                  textColor="#111827"
                  style={{ width: '100%', backgroundColor: '#fff' }}
                />
              </View>
            </View>
          )}

          {/* Android : picker natif dialogue */}
          {Platform.OS === 'android' && (
            <DateTimePicker
              value={tempDate}
              mode={pickerStep.endsWith('time') ? 'time' : 'date'}
              display="default"
              onChange={onPickerChange}
              minuteInterval={15}
              minimumDate={pickerStep.startsWith('end') ? (startDate ?? new Date()) : new Date()}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  screenHeader: { backgroundColor: BLUE, paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  screenTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  screenSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  scroll: { padding: 16, gap: 16 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  chevron: { fontSize: 12, color: '#6B7280' },
  addBtn: { backgroundColor: BLUE, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  addForm: { gap: 10, marginTop: 4 },

  // Bouton picker
  pickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  pickerBtnLabel: { fontSize: 12, fontWeight: '700', color: BLUE, width: 40 },
  pickerBtnValue: { flex: 1, fontSize: 14, color: '#111827' },
  pickerBtnPlaceholder: { color: '#9CA3AF' },
  pickerArrow: { fontSize: 18 },

  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' },
  error: { color: RED, fontSize: 12, marginTop: 4 },
  success: { color: GREEN, fontSize: 12, marginTop: 6 },
  saveBtn: { backgroundColor: BLUE, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyText: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
  availRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  availText: { fontSize: 13, color: '#374151', flex: 1 },
  deleteBtn: { fontSize: 18, paddingLeft: 8 },
  logoutBtn: { backgroundColor: '#FEE2E2', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: RED, fontWeight: '700', fontSize: 15 },

  // Stats de trajet
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  statPeriod: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  statTime: { fontSize: 22, fontWeight: '800', color: BLUE, marginBottom: 2 },
  statEarnings: { fontSize: 18, fontWeight: '700', color: GREEN, marginBottom: 2 },
  statMissions: { fontSize: 12, color: '#9CA3AF' },

  // iOS picker overlay
  iosOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', zIndex: 100 },
  iosModal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 },
  iosModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  iosTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  iosCancel: { fontSize: 15, color: '#6B7280' },
  iosConfirm: { fontSize: 15, fontWeight: '700', color: BLUE },
});
