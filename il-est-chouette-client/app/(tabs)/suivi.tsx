import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
    default:           return { label: status ?? '—',                 emoji: '⏳', color: GRAY_500,  step: 1 };
  }
}

const STATUS_STEPS: OrderStatus[] = ['pending', 'assigned', 'acceptee', 'terminee'];

export default function SuiviScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [cancelledOrder, setCancelledOrder] = useState<Order | null>(null);
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email ?? '';
      setUserEmail(email);
      if (!email) { setLoading(false); return; }

      await loadOrders(email);

      channel = supabase
        .channel('client-order-updates')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
          const updated = payload.new as Order & { cancellation_reason?: string };
          if (updated.client_email === email) {
            if (updated.status === 'annulee' && updated.cancellation_reason === 'no_courier') {
              // Annulation automatique — montrer le modal
              setCancelledOrder(updated);
              setOrders(prev => prev.filter(o => o.id !== updated.id));
            } else if (updated.status === 'terminee' || updated.status === 'annulee') {
              setOrders(prev => prev.filter(o => o.id !== updated.id));
            } else {
              setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
            }
          }
        })
        .subscribe();
    }
    init();
    return () => { channel?.unsubscribe(); };
  }, []);

  async function handleReschedule() {
    if (!cancelledOrder) return;
    setRescheduling(true);
    const scheduledAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    await supabase.from('orders').update({
      status: 'pending',
      cancellation_reason: null,
      scheduled_at: scheduledAt,
    }).eq('id', cancelledOrder.id);
    setRescheduling(false);
    setCancelledOrder(null);
    await loadOrders(userEmail);
  }

  async function loadOrders(email: string) {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('client_email', email)
      .not('status', 'in', '("terminee","annulee")')
      .order('created_at', { ascending: false });
    setOrders((data ?? []) as Order[]);
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  if (orders.length === 0) {
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

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>

      {/* Modal annulation automatique */}
      <Modal visible={!!cancelledOrder} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalEmoji}>😕</Text>
            <Text style={styles.modalTitle}>Aucun coursier disponible</Text>
            <Text style={styles.modalText}>
              Votre commande n'a pas pu être prise en charge.{'\n'}
              {cancelledOrder?.stripe_payment_intent_id
                ? 'Votre paiement a été remboursé automatiquement.'
                : 'Que souhaitez-vous faire ?'}
            </Text>

            <Pressable
              style={[styles.modalBtn, styles.modalBtnPrimary]}
              onPress={handleReschedule}
              disabled={rescheduling}
            >
              <Text style={styles.modalBtnPrimaryText}>
                {rescheduling ? 'Reprogrammation...' : '🕐 Reprogrammer dans 6h'}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.modalBtn, styles.modalBtnSecondary]}
              onPress={() => setCancelledOrder(null)}
            >
              <Text style={styles.modalBtnSecondaryText}>
                {cancelledOrder?.stripe_payment_intent_id ? '✅ Remboursement compris' : 'Annuler'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🚴</Text>
        <View>
          <Text style={styles.headerLabel}>
            {orders.length === 1 ? 'En cours' : `${orders.length} commandes en cours`}
          </Text>
          <Text style={styles.headerTitle}>{t('tracking.title')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {orders.map((order, idx) => (
          <OrderCard key={order.id} order={order} index={idx} total={orders.length} t={t} />
        ))}

        <Pressable style={styles.callBtn} onPress={() => Linking.openURL('tel:0695427312')}>
          <Text style={styles.callBtnText}>📞 {t('tracking.call_us')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function OrderCard({ order, index, total, t }: { order: Order; index: number; total: number; t: (k: string) => string }) {
  const service = getService(order.service_type);
  const { label, emoji, color, step } = getStatusInfo(order.status, t);
  const isCancelled = order.status === 'annulee';

  return (
    <View style={styles.card}>
      {/* Card header with status */}
      <View style={[styles.cardHeader, { backgroundColor: isCancelled ? RED : color }]}>
        <Text style={styles.cardHeaderEmoji}>{emoji}</Text>
        <View style={{ flex: 1 }}>
          {total > 1 && <Text style={styles.cardHeaderIndex}>Commande {index + 1}</Text>}
          <Text style={styles.cardHeaderLabel}>{label}</Text>
        </View>
      </View>

      {/* Timeline */}
      {!isCancelled && <OrderTimeline step={step} />}

      {/* Details */}
      <View style={styles.cardBody}>
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
    </View>
  );
}

const TIMELINE_STEPS = [
  { status: 'pending',  emoji: '📋', title: 'Commande reçue',      desc: 'Votre demande a bien été enregistrée' },
  { status: 'assigned', emoji: '👤', title: 'Coursier assigné',    desc: 'Un coursier a accepté votre commande' },
  { status: 'acceptee', emoji: '🚴', title: 'En route',            desc: 'Votre coursier est en chemin' },
  { status: 'terminee', emoji: '✅', title: 'Livré',               desc: 'Votre commande a été livrée' },
];

function OrderTimeline({ step }: { step: number }) {
  return (
    <View style={styles.timeline}>
      {TIMELINE_STEPS.map((s, i) => {
        const isDone = step > i + 1;
        const isCurrent = step === i + 1;
        const isLast = i === TIMELINE_STEPS.length - 1;
        return (
          <View key={s.status} style={styles.timelineRow}>
            {/* Left column: dot + line */}
            <View style={styles.timelineLeft}>
              <View style={[
                styles.timelineDot,
                isDone && styles.timelineDotDone,
                isCurrent && styles.timelineDotCurrent,
              ]}>
                <Text style={styles.timelineDotEmoji}>{s.emoji}</Text>
              </View>
              {!isLast && (
                <View style={[styles.timelineConnector, isDone && styles.timelineConnectorDone]} />
              )}
            </View>
            {/* Right column: text */}
            <View style={[styles.timelineContent, !isLast && { paddingBottom: 20 }]}>
              <Text style={[
                styles.timelineTitle,
                isDone && styles.timelineTitleDone,
                isCurrent && styles.timelineTitleCurrent,
              ]}>
                {s.title}
              </Text>
              <Text style={[
                styles.timelineDesc,
                !isDone && !isCurrent && styles.timelineDescFuture,
              ]}>
                {s.desc}
              </Text>
              {isCurrent && (
                <View style={styles.timelineBadge}>
                  <Text style={styles.timelineBadgeText}>En cours</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
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

  header: {
    paddingTop: 60, paddingBottom: 24, paddingHorizontal: 24,
    flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: ORANGE,
  },
  headerEmoji: { fontSize: 40 },
  headerLabel: { fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  headerTitle: { fontSize: 22, color: '#fff', fontWeight: '800' },

  scroll: { padding: 16, gap: 16, paddingBottom: 40 },

  card: {
    backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 14,
  },
  cardHeaderEmoji: { fontSize: 28 },
  cardHeaderIndex: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardHeaderLabel: { fontSize: 15, color: '#fff', fontWeight: '700' },

  timeline: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  timelineRow: { flexDirection: 'row', gap: 14 },
  timelineLeft: { alignItems: 'center', width: 38 },
  timelineDot: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  timelineDotDone: { backgroundColor: GREEN, borderColor: GREEN },
  timelineDotCurrent: { backgroundColor: ORANGE, borderColor: ORANGE },
  timelineDotEmoji: { fontSize: 17 },
  timelineConnector: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginVertical: 3, minHeight: 16 },
  timelineConnectorDone: { backgroundColor: GREEN },
  timelineContent: { flex: 1, paddingTop: 6 },
  timelineTitle: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  timelineTitleDone: { color: GREEN, fontWeight: '700' },
  timelineTitleCurrent: { color: '#111827', fontWeight: '800' },
  timelineDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  timelineDescFuture: { color: '#D1D5DB' },
  timelineBadge: {
    alignSelf: 'flex-start', marginTop: 6,
    backgroundColor: ORANGE, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
  },
  timelineBadgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },

  cardBody: { padding: 18, gap: 12 },
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

  // Modal annulation
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', gap: 12, width: '100%' },
  modalEmoji: { fontSize: 56 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center' },
  modalText: { fontSize: 14, color: GRAY_500, textAlign: 'center', lineHeight: 20 },
  modalBtn: { width: '100%', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  modalBtnPrimary: { backgroundColor: ORANGE },
  modalBtnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  modalBtnSecondary: { backgroundColor: '#F3F4F6' },
  modalBtnSecondaryText: { color: GRAY_700, fontWeight: '700', fontSize: 15 },
});
