import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import type { Assignment } from '@/lib/types';

const BLUE = '#1B5E9B';
const GREEN = '#16A34A';
const RED = '#DC2626';

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusLabel(status?: string | null) {
  switch (status) {
    case 'terminee': return { label: 'Terminée', color: GREEN };
    case 'annulee': return { label: 'Annulée', color: RED };
    case 'refusee': return { label: 'Refusée', color: RED };
    default: return { label: status ?? '—', color: '#6B7280' };
  }
}

const PAGE_SIZE = 20;

export default function HistoriqueScreen() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [userEmail, setUserEmail] = useState('');
  const [loadError, setLoadError] = useState('');

  const totalGagne = useMemo(() =>
    assignments
      .filter((a) => a.status === 'terminee' && a.order)
      .reduce((sum, a) => sum + ((a.order!.price_total - (a.order!.price_items ?? 0)) * 0.60), 0),
    [assignments]
  );

  useEffect(() => {
    loadData(0, true);
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) loadData(0, true, session.user.email);
    });
    return () => { authSub.unsubscribe(); };
  }, []);

  async function loadData(pageIndex = 0, reset = false, emailOverride?: string) {
    const { data: sessionData } = await supabase.auth.getSession();
    const email = emailOverride || sessionData.session?.user?.email || '';
    if (!email) { setLoading(false); setRefreshing(false); setLoadingMore(false); return; }
    setUserEmail(email);

    const { data, error } = await supabase
      .from('assignments')
      .select('*, order:orders(id,service_type,pickup_address,pickup_place_name,dropoff_address,price_total,price_items,created_at,scheduled_at)')
      .eq('courier_email', email)
      .in('status', ['terminee', 'annulee', 'refusee'])
      .order('assigned_at', { ascending: false })
      .range(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE - 1);

    if (error) {
      setLoadError(`Erreur : ${error.message} (code: ${error.code})`);
    } else if (data) {
      setLoadError('');
      const list = data as unknown as Assignment[];
      setAssignments(prev => reset ? list : [...prev, ...list]);
      setHasMore(list.length === PAGE_SIZE);
      setPage(pageIndex);
    }
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    loadData(page + 1);
  }, [loadingMore, hasMore, page]);

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
        <Text style={styles.screenTitle}>Historique</Text>
        <Text style={styles.screenSubtitle}>{assignments.length} missions</Text>
      </View>

      {/* Total gagné */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total gagné (60%)</Text>
        <Text style={styles.totalValue}>{totalGagne.toFixed(2)} €</Text>
      </View>

      <FlatList
        data={assignments}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(0, true); }}
            tintColor={BLUE}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{loadError ? '⚠️' : '📋'}</Text>
            <Text style={styles.emptyTitle}>{loadError ? 'Erreur de chargement' : 'Aucune mission passée'}</Text>
            {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
          </View>
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={BLUE} style={{ marginVertical: 16 }} /> : null}
        renderItem={({ item: a }) => {
          const { label, color } = statusLabel(a.status);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardDate}>{formatDate(a.assigned_at)}</Text>
                <View style={[styles.badge, { backgroundColor: color + '20' }]}>
                  <Text style={[styles.badgeText, { color }]}>{label}</Text>
                </View>
              </View>
              {a.order ? (
                <>
                  <Text style={styles.address} numberOfLines={1}>
                    📍 {a.order.pickup_place_name || a.order.pickup_address}
                  </Text>
                  <Text style={styles.address} numberOfLines={1}>
                    🏁 {a.order.dropoff_address}
                  </Text>
                  {a.status === 'terminee' && (
                    <Text style={styles.earned}>
                      +{((a.order.price_total - (a.order.price_items ?? 0)) * 0.60).toFixed(2)} €
                    </Text>
                  )}
                </>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  screenHeader: {
    backgroundColor: BLUE,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  screenTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  screenSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  totalCard: {
    backgroundColor: GREEN,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  totalValue: { color: '#fff', fontSize: 24, fontWeight: '800' },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardDate: { fontSize: 12, color: '#6B7280' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  address: { fontSize: 13, color: '#374151', marginBottom: 2 },
  earned: { fontSize: 16, fontWeight: '700', color: GREEN, marginTop: 6 },
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280', textAlign: 'center' },
  errorText: { fontSize: 13, color: '#DC2626', marginTop: 8, textAlign: 'center', lineHeight: 18 },
});
