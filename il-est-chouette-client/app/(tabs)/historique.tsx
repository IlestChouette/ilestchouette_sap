import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { getService } from '@/lib/services';
import type { Order } from '@/lib/types';
import { ORANGE, ORANGE_LIGHT, GREEN, RED, GRAY_500, GRAY_700, BG } from '@/constants/theme';

type Filter = 'all' | 'active' | 'terminee' | 'annulee';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',      label: 'Tout' },
  { key: 'active',   label: 'En cours' },
  { key: 'terminee', label: 'Livrées' },
  { key: 'annulee',  label: 'Annulées' },
];

function statusBadge(status?: string | null) {
  switch (status) {
    case 'terminee': return { label: 'Livré ✓',  bg: '#D1FAE5', color: GREEN };
    case 'annulee':  return { label: 'Annulée',  bg: '#FEE2E2', color: RED };
    case 'assigned': return { label: 'Assignée', bg: ORANGE_LIGHT, color: ORANGE };
    case 'acceptee': return { label: 'En route', bg: ORANGE_LIGHT, color: ORANGE };
    default:         return { label: 'En attente', bg: '#FFF7ED', color: '#B45309' };
  }
}

function isActive(status?: string | null) {
  return status !== 'terminee' && status !== 'annulee';
}

export default function HistoriqueScreen() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email ?? '';
      if (!email) { setLoading(false); return; }

      const { data: rows } = await supabase
        .from('orders')
        .select('*')
        .eq('client_email', email)
        .order('created_at', { ascending: false })
        .limit(100);

      setOrders((rows ?? []) as Order[]);
      setLoading(false);
    }
    init();
  }, []);

  const filtered = orders.filter((o) => {
    if (filter === 'all')      return true;
    if (filter === 'active')   return isActive(o.status);
    return o.status === filter;
  });

  const doneOrders = orders.filter(o => o.status === 'terminee');
  const totalPaid  = doneOrders.reduce((acc, o) => acc + o.price_total, 0);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={ORANGE} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('history.title')}</Text>
        {orders.length > 0 && (
          <View style={styles.statsRow}>
            <StatPill emoji="📦" value={`${orders.length}`} label="commandes" />
            <StatPill emoji="✅" value={`${doneOrders.length}`} label="livrées" />
            <StatPill emoji="💶" value={`${totalPaid.toFixed(0)} €`} label="dépensés" />
          </View>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <Pressable
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyText}>
            {orders.length === 0 ? t('history.empty') : 'Aucune commande dans cette catégorie'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {filtered.map((order) => {
            const service = getService(order.service_type);
            const { label, bg, color } = statusBadge(order.status);
            const date = new Date(order.created_at);

            return (
              <View key={order.id} style={styles.card}>
                {/* Top */}
                <View style={styles.cardTop}>
                  <Text style={styles.cardEmoji}>{service?.emoji ?? '📦'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardService}>
                      {service ? t(service.labelKey) : order.service_type}
                    </Text>
                    <Text style={styles.cardDate}>
                      {date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: bg }]}>
                    <Text style={[styles.badgeText, { color }]}>{label}</Text>
                  </View>
                </View>

                {/* Adresses */}
                {order.pickup_address && (
                  <View style={styles.addressRow}>
                    <Text style={styles.addressIcon}>📍</Text>
                    <Text style={styles.addressText} numberOfLines={1}>{order.pickup_address}</Text>
                  </View>
                )}
                <View style={styles.addressRow}>
                  <Text style={styles.addressIcon}>🏁</Text>
                  <Text style={styles.addressText} numberOfLines={1}>{order.dropoff_address}</Text>
                </View>

                {/* Notes */}
                {order.notes && (
                  <View style={styles.notesRow}>
                    <Text style={styles.notesText} numberOfLines={2}>📝 {order.notes}</Text>
                  </View>
                )}

                {/* Prix + facture */}
                <View style={styles.cardBottom}>
                  <Text style={styles.price}>{order.price_total.toFixed(2)} €</Text>
                  {order.wants_invoice && (
                    <Pressable
                      style={styles.invoiceBtn}
                      onPress={() => Linking.openURL(`https://www.ilestchouette.fr/operateur/facture/${order.id}`)}
                    >
                      <Text style={styles.invoiceBtnText}>🧾 {t('history.invoice')}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
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
  header: { backgroundColor: ORANGE, paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statPill: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', flex: 1 },
  statEmoji: { fontSize: 16 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#fff', marginTop: 2 },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 1 },

  filterRow: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, gap: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  filterBtn: { flex: 1, paddingVertical: 7, borderRadius: 20, alignItems: 'center', backgroundColor: '#F3F4F6' },
  filterBtnActive: { backgroundColor: ORANGE },
  filterText: { fontSize: 12, fontWeight: '600', color: GRAY_500 },
  filterTextActive: { color: '#fff' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyText: { fontSize: 15, color: GRAY_500, textAlign: 'center', paddingHorizontal: 32 },

  scroll: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardEmoji: { fontSize: 28 },
  cardService: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardDate: { fontSize: 11, color: GRAY_500, marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addressIcon: { fontSize: 14 },
  addressText: { fontSize: 12, color: GRAY_700, flex: 1 },
  notesRow: { backgroundColor: '#F9FAFB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  notesText: { fontSize: 12, color: GRAY_500, fontStyle: 'italic' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  price: { fontSize: 18, fontWeight: '800', color: ORANGE },
  invoiceBtn: { backgroundColor: ORANGE_LIGHT, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  invoiceBtnText: { fontSize: 12, fontWeight: '700', color: ORANGE },
});
