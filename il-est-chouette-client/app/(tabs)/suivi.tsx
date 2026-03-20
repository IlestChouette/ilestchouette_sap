import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { getService } from '@/lib/services';
import type { Order, OrderStatus } from '@/lib/types';
import { ORANGE, ORANGE_LIGHT, ORANGE_BORDER, GREEN, RED, GRAY_500, GRAY_700, BG } from '@/constants/theme';

type StatusInfo = { label: string; emoji: string; color: string; step: number };

function getStatusInfo(status: OrderStatus | string | null | undefined, t: (k: string) => string): StatusInfo {
  switch (status) {
    case 'pending':    return { label: t('tracking.status_pending'),  emoji: '⏳', color: '#B45309', step: 1 };
    case 'assigned':   return { label: t('tracking.status_assigned'), emoji: '👤', color: ORANGE,    step: 2 };
    case 'acceptee':   return { label: t('tracking.status_acceptee'), emoji: '🚴', color: ORANGE,    step: 3 };
    case 'terminee':   return { label: t('tracking.status_terminee'), emoji: '✅', color: GREEN,     step: 4 };
    case 'annulee':    return { label: t('tracking.status_annulee'),  emoji: '❌', color: RED,       step: 0 };
    default:           return { label: status ?? '—',                emoji: '⏳', color: GRAY_500,  step: 1 };
  }
}

const STATUS_STEPS: OrderStatus[] = ['pending', 'assigned', 'acceptee', 'terminee'];

export default function SuiviScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email ?? '';
      setUserEmail(email);
      if (!email) { setLoading(false); return; }

      await loadOrder(email);

      channel = supabase
        .channel('client-order-updates')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
          const updated = payload.new as Order;
          if (updated.client_email === email) setOrder(updated);
        })
        .subscribe();
    }
    init();
    return () => { channel?.unsubscribe(); };
  }, []);

  async function loadOrder(email: string) {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('client_email', email)
      .not('status', 'in', '("terminee","annulee")')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setOrder(data as Order | null);
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🚴</Text>
        <Text style={styles.emptyTitle}>{t('tracking.no_order')}</Text>
        <Pressable style={styles.orderBtn} onPress={() => router.push('/commander')}>
          <Text style={styles.orderBtnText}>{t('tracking.place_order')}</Text>
        </Pressable>
      </View>
    );
  }

  const service = getService(order.service_type);
  const { label, emoji, color, step } = getStatusInfo(order.status, t);
  const isCancelled = order.status === 'annulee';
  const isDone = order.status === 'terminee';

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isCancelled ? RED : isDone ? GREEN : ORANGE }]}>
        <Text style={styles.headerEmoji}>{emoji}</Text>
        <View>
          <Text style={styles.headerLabel}>{label}</Text>
          <Text style={styles.headerTitle}>{t('tracking.title')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Barre de progression */}
        {!isCancelled && (
          <View style={styles.progressBar}>
            {STATUS_STEPS.map((s, i) => {
              const info = getStatusInfo(s, t);
              const done2 = step > i + 1;
              const current = step === i + 1;
              return (
                <View key={s} style={styles.progressStep}>
                  <View style={[styles.progressDot, done2 && styles.progressDotDone, current && styles.progressDotCurrent]}>
                    <Text style={[styles.progressDotText, (done2 || current) && { color: '#fff' }]}>{info.emoji}</Text>
                  </View>
                  {i < STATUS_STEPS.length - 1 && (
                    <View style={[styles.progressLine, done2 && styles.progressLineDone]} />
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Détails commande */}
        <View style={styles.card}>
          <DetailRow icon="🔧" label={t('tracking.service')} value={`${service?.emoji ?? ''} ${service ? t(service.labelKey) : order.service_type}`} />
          {order.pickup_address && <DetailRow icon="📍" label={t('tracking.pickup')} value={order.pickup_address} />}
          <DetailRow icon="🏁" label={t('tracking.dropoff')} value={order.dropoff_address} />
          {order.scheduled_at && (
            <DetailRow icon="📅" label={t('tracking.scheduled')} value={new Date(order.scheduled_at).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })} />
          )}
          <View style={styles.divider} />
          <DetailRow icon="💶" label={t('tracking.price')} value={`${order.price_total.toFixed(2)} €`} bold />
          {order.validation_code && (
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>{t('tracking.validation_code')}</Text>
              <Text style={styles.codeValue}>{order.validation_code}</Text>
            </View>
          )}
        </View>

        {/* Bouton appel */}
        <Pressable style={styles.callBtn} onPress={() => Linking.openURL('tel:0695427312')}>
          <Text style={styles.callBtnText}>📞 {t('tracking.call_us')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function DetailRow({ icon, label, value, bold }: { icon: string; label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, bold && { color: ORANGE, fontWeight: '800', fontSize: 16 }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG, gap: 16, padding: 32 },
  emptyEmoji: { fontSize: 72 },
  emptyTitle: { fontSize: 18, color: GRAY_500, textAlign: 'center' },
  orderBtn: { backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  orderBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  header: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerEmoji: { fontSize: 40 },
  headerLabel: { fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  headerTitle: { fontSize: 22, color: '#fff', fontWeight: '800' },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  progressBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  progressStep: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  progressDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  progressDotDone: { backgroundColor: GREEN, borderColor: GREEN },
  progressDotCurrent: { backgroundColor: ORANGE, borderColor: ORANGE },
  progressDotText: { fontSize: 16 },
  progressLine: { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 4 },
  progressLineDone: { backgroundColor: GREEN },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
  detailRow: { flexDirection: 'row', gap: 12 },
  detailIcon: { fontSize: 20, marginTop: 2 },
  detailLabel: { fontSize: 11, color: GRAY_500, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 14, color: GRAY_700, fontWeight: '500', marginTop: 2 },
  codeBox: { backgroundColor: ORANGE_LIGHT, borderWidth: 1.5, borderColor: ORANGE_BORDER, borderRadius: 12, padding: 14, alignItems: 'center', gap: 6 },
  codeLabel: { fontSize: 12, color: '#92400E', fontWeight: '600' },
  codeValue: { fontSize: 32, fontWeight: '900', color: ORANGE, letterSpacing: 6 },
  callBtn: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  callBtnText: { fontSize: 15, fontWeight: '700', color: GRAY_700 },
});
