import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { getService } from '@/lib/services';
import type { Order } from '@/lib/types';
import { ORANGE, ORANGE_LIGHT, GREEN, RED, GRAY_500, GRAY_700, BG } from '@/constants/theme';

function statusBadge(status?: string | null) {
  switch (status) {
    case 'terminee': return { label: 'Livré ✓', bg: '#D1FAE5', color: GREEN };
    case 'annulee':  return { label: 'Annulée', bg: '#FEE2E2', color: RED };
    default:         return { label: 'En cours', bg: ORANGE_LIGHT, color: ORANGE };
  }
}

export default function HistoriqueScreen() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email ?? '';
      setUserEmail(email);
      if (!email) { setLoading(false); return; }

      const { data: rows } = await supabase
        .from('orders')
        .select('*')
        .eq('client_email', email)
        .order('created_at', { ascending: false })
        .limit(50);

      setOrders((rows ?? []) as Order[]);
      setLoading(false);
    }
    init();
  }, []);

  const totalPaid = orders
    .filter((o) => o.status === 'terminee')
    .reduce((acc, o) => acc + o.price_total, 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('history.title')}</Text>
        {orders.length > 0 && (
          <Text style={styles.headerSub}>{t('history.total')} : {totalPaid.toFixed(2)} €</Text>
        )}
      </View>

      {orders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyText}>{t('history.empty')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {orders.map((order) => {
            const service = getService(order.service_type);
            const { label, bg, color } = statusBadge(order.status);
            const date = new Date(order.created_at);

            return (
              <View key={order.id} style={styles.card}>
                {/* Top row */}
                <View style={styles.cardTop}>
                  <Text style={styles.cardEmoji}>{service?.emoji ?? '📦'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardService}>{service ? t(service.labelKey) : order.service_type}</Text>
                    <Text style={styles.cardDate}>
                      {date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: bg }]}>
                    <Text style={[styles.badgeText, { color }]}>{label}</Text>
                  </View>
                </View>

                {/* Adresses */}
                <View style={styles.addressRow}>
                  <Text style={styles.addressIcon}>📍</Text>
                  <Text style={styles.addressText} numberOfLines={1}>{order.pickup_address ?? '—'}</Text>
                </View>
                <View style={styles.addressRow}>
                  <Text style={styles.addressIcon}>🏁</Text>
                  <Text style={styles.addressText} numberOfLines={1}>{order.dropoff_address}</Text>
                </View>

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

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  header: { backgroundColor: ORANGE, paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyText: { fontSize: 15, color: GRAY_500 },
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
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  price: { fontSize: 18, fontWeight: '800', color: ORANGE },
  invoiceBtn: { backgroundColor: ORANGE_LIGHT, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  invoiceBtnText: { fontSize: 12, fontWeight: '700', color: ORANGE },
});
