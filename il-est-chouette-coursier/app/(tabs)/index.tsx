import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { stopMissionSound } from '@/lib/sound';
import type { Assignment, AssignmentStatus } from '@/lib/types';

const BLUE = '#1B5E9B';
const GREEN = '#16A34A';
const RED = '#DC2626';
const ORANGE = '#EA580C';

function buildMapsUrl(assignment: Assignment): string {
  const order = assignment.order;
  if (!order) return '';
  const origin = encodeURIComponent(order.pickup_address ?? '');
  const destination = encodeURIComponent(order.dropoff_address ?? '');
  if (Platform.OS === 'ios') {
    return `maps://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=d`;
  }
  return `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${origin}&destination=${destination}`;
}

function statusLabel(status?: AssignmentStatus | null) {
  switch (status) {
    case 'assigned': return { label: 'En attente', color: ORANGE };
    case 'acceptee': return { label: 'Acceptée', color: GREEN };
    case 'terminee': return { label: 'Terminée', color: '#6B7280' };
    case 'annulee': return { label: 'Annulée', color: RED };
    case 'refusee': return { label: 'Refusée', color: RED };
    default: return { label: status ?? '—', color: '#6B7280' };
  }
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/* ---- Carte d'une mission ---- */
function MissionCard({
  assignment,
  onAccept,
  onRefuse,
  onFinish,
}: {
  assignment: Assignment;
  onAccept: (id: string) => void;
  onRefuse: (id: string) => void;
  onFinish: (id: string) => void;
}) {
  const order = assignment.order;
  const { label, color } = statusLabel(assignment.status);
  const mapsUrl = buildMapsUrl(assignment);

  return (
    <View style={styles.card}>
      {/* Header carte */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>{formatDate(assignment.assigned_at)}</Text>
        <View style={[styles.badge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.badgeText, { color }]}>{label}</Text>
        </View>
      </View>

      {/* Adresses */}
      {order ? (
        <>
          <View style={styles.addressRow}>
            <View style={[styles.dot, { backgroundColor: BLUE }]} />
            <Text style={styles.addressText} numberOfLines={2}>{order.pickup_place_name || order.pickup_address}</Text>
          </View>
          {order.extra_stops?.map((stop, i) => (
            <View key={i} style={styles.addressRow}>
              <View style={[styles.dot, { backgroundColor: ORANGE }]} />
              <Text style={styles.addressText} numberOfLines={1}>{stop}</Text>
            </View>
          ))}
          <View style={styles.addressRow}>
            <View style={[styles.dot, { backgroundColor: GREEN }]} />
            <Text style={styles.addressText} numberOfLines={2}>{order.dropoff_address}</Text>
          </View>

          {/* Notes */}
          {order.notes ? (
            <Text style={styles.notes}>Note : {order.notes}</Text>
          ) : null}
          {order.access_info ? (
            <Text style={styles.notes}>Accès : {order.access_info}</Text>
          ) : null}

          {/* Prix */}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Votre part</Text>
            <Text style={styles.priceValue}>{(order.price_total * 0.65).toFixed(2)} €</Text>
            {order.express && <View style={styles.expressBadge}><Text style={styles.expressText}>EXPRESS</Text></View>}
          </View>
        </>
      ) : (
        <Text style={styles.notes}>Détails non disponibles</Text>
      )}

      {/* Bouton navigation */}
      {mapsUrl ? (
        <Pressable
          style={styles.mapsBtn}
          onPress={() => Linking.openURL(mapsUrl)}
        >
          <Text style={styles.mapsBtnText}>📍 Ouvrir l'itinéraire</Text>
        </Pressable>
      ) : null}

      {/* Actions selon statut */}
      {assignment.status === 'assigned' && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, styles.refuseBtn]}
            onPress={() => onRefuse(assignment.id)}
          >
            <Text style={styles.refuseBtnText}>Refuser</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={() => onAccept(assignment.id)}
          >
            <Text style={styles.acceptBtnText}>Accepter</Text>
          </Pressable>
        </View>
      )}

      {assignment.status === 'acceptee' && (
        <Pressable
          style={[styles.actionBtn, styles.finishBtn, { marginTop: 12 }]}
          onPress={() => onFinish(assignment.id)}
        >
          <Text style={styles.acceptBtnText}>Terminer la mission</Text>
        </Pressable>
      )}
    </View>
  );
}

/* ---- Modale de clôture ---- */
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://ilestchouette-sap.vercel.app';

function FinishModal({
  assignmentId,
  orderId,
  validationCode,
  onClose,
  onDone,
}: {
  assignmentId: string;
  orderId: string;
  validationCode?: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [code, setCode] = useState('');
  const [payment, setPayment] = useState<'cash' | 'card' | 'to_pay' | ''>('');
  const [wantsInvoice, setWantsInvoice] = useState<'yes' | 'no' | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleFinish() {
    if (validationCode && code !== validationCode) {
      setError('Code de validation incorrect.');
      return;
    }
    if (!payment) {
      setError('Choisis le mode de paiement.');
      return;
    }
    if (wantsInvoice === '') {
      setError('Indique si le client souhaite une facture.');
      return;
    }
    setLoading(true);
    const wantsInvoiceBool = wantsInvoice === 'yes';

    // 1. Mettre à jour l'assignment
    const { error: err1 } = await supabase
      .from('assignments')
      .update({ status: 'terminee', payment_method: payment, validated_with_code: !!code })
      .eq('id', assignmentId);

    if (err1) { setError('Erreur lors de la clôture.'); setLoading(false); return; }

    // 2. Mettre à jour la commande (toujours — facture générée systématiquement)
    await supabase
      .from('orders')
      .update({ status: 'terminee', wants_invoice: wantsInvoiceBool })
      .eq('id', orderId);

    // 3. Enregistrer l'événement
    const { data: session } = await supabase.auth.getSession();
    await supabase.from('events').insert({
      type: 'delivery_completed',
      courier_email: session.session?.user?.email,
      assignment_id: assignmentId,
      order_id: orderId,
      payment_method: payment,
      needs_invoice: wantsInvoiceBool,
    });

    setLoading(false);

    // 4. Si le client veut la facture → ouvrir dans le navigateur
    if (wantsInvoiceBool) {
      const url = `${WEB_URL}/operateur/facture/${orderId}`;
      Linking.openURL(url);
    }

    onDone();
  }

  const PAYMENTS: { key: 'cash' | 'card' | 'to_pay'; label: string }[] = [
    { key: 'cash', label: '💵 Espèces' },
    { key: 'card', label: '💳 Carte' },
    { key: 'to_pay', label: '🔄 À facturer' },
  ];

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <Text style={styles.modalTitle}>Terminer la mission</Text>

        {validationCode ? (
          <>
            <Text style={styles.label}>Code de validation client</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="Code à 6 chiffres"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              maxLength={6}
            />
          </>
        ) : null}

        <Text style={styles.label}>Mode de paiement</Text>
        <View style={styles.paymentRow}>
          {PAYMENTS.map((p) => (
            <Pressable
              key={p.key}
              style={[styles.paymentBtn, payment === p.key && styles.paymentBtnActive]}
              onPress={() => setPayment(p.key)}
            >
              <Text style={[styles.paymentBtnText, payment === p.key && styles.paymentBtnTextActive]}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Le client souhaite une facture ?</Text>
        <View style={styles.paymentRow}>
          <Pressable
            style={[styles.paymentBtn, wantsInvoice === 'yes' && styles.paymentBtnActive]}
            onPress={() => setWantsInvoice('yes')}
          >
            <Text style={[styles.paymentBtnText, wantsInvoice === 'yes' && styles.paymentBtnTextActive]}>
              ✅ Oui — afficher
            </Text>
          </Pressable>
          <Pressable
            style={[styles.paymentBtn, wantsInvoice === 'no' && styles.paymentBtnActive]}
            onPress={() => setWantsInvoice('no')}
          >
            <Text style={[styles.paymentBtnText, wantsInvoice === 'no' && styles.paymentBtnTextActive]}>
              ❌ Non
            </Text>
          </Pressable>
        </View>

        {wantsInvoice === 'yes' && (
          <Text style={styles.invoiceHint}>
            La facture s'ouvrira dans le navigateur après confirmation.
          </Text>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <Pressable style={[styles.actionBtn, styles.refuseBtn]} onPress={onClose}>
            <Text style={styles.refuseBtnText}>Annuler</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={handleFinish}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptBtnText}>Confirmer</Text>}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

type PendingOrder = {
  id: string;
  service_type: string;
  pickup_address: string | null;
  dropoff_address: string;
  notes: string | null;
  price_total: number;
  created_at: string;
  scheduled_at: string | null;
};

const SERVICE_LABELS: Record<string, string> = {
  supermarket: '🛒 Courses supermarché',
  meds: '💊 Pharmacie',
  food: '🍕 Livraison repas',
  keys: '🗝️ Clés / documents',
  shopping: '🛍️ Shopping',
  express: '⚡ Express urgent',
  voiturier: '🚗 Voiturier',
  it: '💻 Soutien informatique',
  assist: '🤝 Assistance',
  bricolage: '🔧 Bricolage',
  diy: '🔧 Bricolage',
};

/* ======== ÉCRAN PRINCIPAL ======== */
export default function DashboardScreen() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [courierEmail, setCourierEmail] = useState('');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20_000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    const { data: sessionData } = await supabase.auth.getSession();
    const userEmail = sessionData.session?.user?.email ?? '';
    setCourierEmail(userEmail);

    // Mes missions assignées
    const { data: myAssignments } = await supabase
      .from('assignments')
      .select('*, order:orders(*)')
      .eq('courier_email', userEmail)
      .in('status', ['assigned', 'acceptee'])
      .order('assigned_at', { ascending: false });

    if (myAssignments) setAssignments(myAssignments as Assignment[]);

    // Commandes en attente non encore assignées
    const { data: activeAssignments } = await supabase
      .from('assignments')
      .select('order_id')
      .in('status', ['assigned', 'acceptee']);

    const takenOrderIds = (activeAssignments ?? []).map((a: any) => a.order_id);

    let query = supabase
      .from('orders')
      .select('id, service_type, pickup_address, dropoff_address, notes, price_total, created_at, scheduled_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (takenOrderIds.length > 0) {
      query = query.not('id', 'in', `(${takenOrderIds.join(',')})`);
    }

    const { data: available } = await query;
    setPendingOrders((available ?? []) as PendingOrder[]);

    setLoading(false);
    setRefreshing(false);
  }

  async function handleClaimOrder(order: PendingOrder) {
    Alert.alert(
      'Prendre cette mission ?',
      `${order.service_type} — ${order.dropoff_address}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter',
          onPress: async () => {
            const { error } = await supabase.from('assignments').insert({
              courier_email: courierEmail,
              order_id: order.id,
              status: 'acceptee',
              assigned_at: new Date().toISOString(),
            });
            if (error) {
              Alert.alert('Erreur', 'Mission déjà prise ou erreur serveur.');
            } else {
              await supabase.from('orders').update({ status: 'en_cours' }).eq('id', order.id);
              loadData();
            }
          },
        },
      ],
    );
  }

  async function handleAccept(id: string) {
    stopMissionSound();
    const { error } = await supabase
      .from('assignments')
      .update({ status: 'acceptee' })
      .eq('id', id);

    if (error) {
      Alert.alert('Erreur', 'Impossible d\'accepter la mission.');
    } else {
      loadData();
    }
  }

  async function handleRefuse(id: string) {
    stopMissionSound();
    Alert.alert(
      'Refuser la mission',
      'Es-tu sûr de vouloir refuser cette mission ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: async () => {
            await supabase
              .from('assignments')
              .update({ status: 'refusee' })
              .eq('id', id);
            loadData();
          },
        },
      ],
    );
  }

  const finishingAssignment = assignments.find((a) => a.id === finishingId);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={BLUE} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F0F8FF' }}>
      {/* Header */}
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Mes missions</Text>
        <Text style={styles.screenSubtitle}>{assignments.length} en cours</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(); }}
            tintColor={BLUE}
          />
        }
      >
        {/* Commandes disponibles à prendre */}
        {pendingOrders.filter((o) => !skippedIds.has(o.id) && (o.price_total ?? 0) > 0).length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔔 Nouvelles commandes disponibles</Text>
            </View>
            {pendingOrders
              .filter((o) => !skippedIds.has(o.id) && (o.price_total ?? 0) > 0)
              .map((o) => (
                <View key={o.id} style={styles.availableCard}>
                  <View style={styles.availableTop}>
                    <Text style={styles.availableService}>{SERVICE_LABELS[o.service_type] ?? o.service_type}</Text>
                    <Text style={styles.availablePrice}>{o.price_total?.toFixed(2)} €</Text>
                  </View>
                  {o.pickup_address ? <Text style={styles.availableAddr}>📍 Depuis : {o.pickup_address}</Text> : null}
                  <Text style={styles.availableAddr}>🏠 Vers : {o.dropoff_address}</Text>
                  {o.notes ? <Text style={styles.availableNotes}>{o.notes}</Text> : null}
                  <View style={styles.availableBtns}>
                    <Pressable style={styles.skipBtn} onPress={() => setSkippedIds((prev) => new Set([...prev, o.id]))}>
                      <Text style={styles.skipBtnText}>Passer</Text>
                    </Pressable>
                    <Pressable style={styles.claimBtn} onPress={() => handleClaimOrder(o)}>
                      <Text style={styles.claimBtnText}>✅ Prendre</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
          </>
        )}

        {/* Mes missions en cours */}
        {assignments.length === 0 && pendingOrders.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyTitle}>Pas de mission en cours</Text>
            <Text style={styles.emptyText}>Les nouvelles commandes apparaîtront ici automatiquement.</Text>
          </View>
        ) : assignments.length > 0 ? (
          <>
            {assignments.length > 0 && <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>📋 Mes missions</Text></View>}
            {assignments.map((a) => (
              <MissionCard
                key={a.id}
                assignment={a}
                onAccept={handleAccept}
                onRefuse={handleRefuse}
                onFinish={(id) => setFinishingId(id)}
              />
            ))}
          </>
        ) : null}
      </ScrollView>

      {/* Modale clôture */}
      {finishingId && finishingAssignment && (
        <FinishModal
          assignmentId={finishingId}
          orderId={finishingAssignment.order_id}
          validationCode={finishingAssignment.order?.validation_code}
          onClose={() => setFinishingId(null)}
          onDone={() => { setFinishingId(null); loadData(); }}
        />
      )}
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
  list: { padding: 16, gap: 12 },

  // Carte
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardDate: { fontSize: 12, color: '#6B7280' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },

  // Adresses
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  addressText: { flex: 1, fontSize: 14, color: '#1F2937' },
  notes: { fontSize: 13, color: '#6B7280', fontStyle: 'italic', marginTop: 4 },

  // Prix
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  priceLabel: { fontSize: 13, color: '#6B7280' },
  priceValue: { fontSize: 18, fontWeight: '700', color: GREEN, flex: 1 },
  expressBadge: { backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  expressText: { fontSize: 11, fontWeight: '700', color: '#92400E' },

  // Navigation
  mapsBtn: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  mapsBtnText: { fontSize: 14, fontWeight: '600', color: BLUE },

  // Boutons actions
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  acceptBtn: { backgroundColor: GREEN },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  refuseBtn: { backgroundColor: '#FEE2E2' },
  refuseBtnText: { color: RED, fontWeight: '700', fontSize: 15 },
  finishBtn: { backgroundColor: BLUE },

  // Empty state
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },

  // Modale
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20, zIndex: 100 },
  modal: { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827' },
  error: { color: RED, fontSize: 13, marginTop: 8, textAlign: 'center' },
  paymentRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  paymentBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  paymentBtnActive: { backgroundColor: BLUE, borderColor: BLUE },
  paymentBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  paymentBtnTextActive: { color: '#fff' },
  invoiceHint: { fontSize: 12, color: '#1B5E9B', fontStyle: 'italic', marginTop: 6, textAlign: 'center' },
  sectionHeader: { paddingHorizontal: 4, paddingTop: 8, paddingBottom: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
  availableCard: { backgroundColor: '#FFF7ED', borderRadius: 14, padding: 14, borderWidth: 2, borderColor: '#F97316', gap: 6, marginBottom: 4 },
  availableTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  availableService: { fontSize: 15, fontWeight: '800', color: '#EA580C' },
  availablePrice: { fontSize: 16, fontWeight: '800', color: '#EA580C' },
  availableAddr: { fontSize: 13, color: '#374151' },
  availableNotes: { fontSize: 12, color: '#6B7280', fontStyle: 'italic' },
  claimBtn: { flex: 1, backgroundColor: '#F97316', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  claimBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  availableBtns: { flexDirection: 'row', gap: 8, marginTop: 6 },
  skipBtn: { paddingHorizontal: 16, borderRadius: 10, paddingVertical: 11, alignItems: 'center', borderWidth: 1.5, borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  skipBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 14 },
});
