import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
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
import SignatureCanvas from 'react-native-signature-canvas';
import { supabase } from '@/lib/supabase';
import { stopMissionSound } from '@/lib/sound';
import type { Assignment, AssignmentStatus } from '@/lib/types';

const BLUE = '#1B5E9B';
const GREEN = '#16A34A';
const RED = '#DC2626';
const ORANGE = '#EA580C';

function buildPickupUrl(address: string): string {
  const dest = encodeURIComponent(address);
  if (Platform.OS === 'ios') return `maps://maps.apple.com/?daddr=${dest}&dirflg=d`;
  return `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${dest}`;
}

function buildDropoffUrl(pickup: string, dropoff: string): string {
  const origin = encodeURIComponent(pickup);
  const dest = encodeURIComponent(dropoff);
  if (Platform.OS === 'ios') return `maps://maps.apple.com/?saddr=${origin}&daddr=${dest}&dirflg=d`;
  return `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${origin}&destination=${dest}`;
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

const PAYMENT_LABELS: Record<string, string> = {
  online_card: '💳 Payé en ligne',
  on_site_cash: '💵 Espèces sur place',
  on_site_card: '💳 Carte sur place',
};

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
  const pickupUrl = order?.pickup_address ? buildPickupUrl(order.pickup_address) : '';
  const dropoffUrl = (order?.pickup_address && order?.dropoff_address)
    ? buildDropoffUrl(order.pickup_address, order.dropoff_address)
    : order?.dropoff_address ? buildPickupUrl(order.dropoff_address) : '';

  const isScheduled = !!order?.scheduled_at;

  return (
    <View style={styles.card}>

      {/* ── Bandeau planifié ── */}
      {isScheduled && (
        <View style={styles.scheduledBanner}>
          <Text style={styles.scheduledText}>
            🗓️ Planifiée le {formatDate(order!.scheduled_at)}
          </Text>
        </View>
      )}

      {/* ── Header : service + statut ── */}
      <View style={styles.cardHeader}>
        <Text style={styles.serviceLabel}>
          {SERVICE_LABELS[order?.service_type ?? ''] ?? order?.service_type ?? '—'}
        </Text>
        <View style={[styles.badge, { backgroundColor: color + '22' }]}>
          <Text style={[styles.badgeText, { color }]}>{label}</Text>
        </View>
      </View>

      {/* ── Date d'assignation ── */}
      <Text style={styles.cardDate}>Assignée le {formatDate(assignment.assigned_at)}</Text>

      {/* ── Séparateur ── */}
      <View style={styles.divider} />

      {/* ── Adresses ── */}
      {order ? (
        <>
          <View style={styles.addressBlock}>
            <View style={styles.addressRow}>
              <View style={[styles.dot, { backgroundColor: BLUE }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.addressLabel}>Départ</Text>
                <Text style={styles.addressText}>{order.pickup_place_name || order.pickup_address}</Text>
              </View>
            </View>

            {order.extra_stops?.map((stop, i) => (
              <View key={i} style={styles.addressRow}>
                <View style={[styles.dot, { backgroundColor: ORANGE }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressLabel}>Étape {i + 1}</Text>
                  <Text style={styles.addressText}>{stop}</Text>
                </View>
              </View>
            ))}

            <View style={styles.addressRow}>
              <View style={[styles.dot, { backgroundColor: GREEN }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.addressLabel}>Destination</Text>
                <Text style={styles.addressText}>{order.dropoff_address}</Text>
              </View>
            </View>
          </View>

          {/* ── Séparateur ── */}
          <View style={styles.divider} />

          {/* ── Infos client ── */}
          <View style={styles.infoSection}>
            {order.client_name ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>👤</Text>
                <Text style={[styles.infoText, { fontWeight: '700' }]}>{order.client_name}</Text>
              </View>
            ) : null}
            {order.client_phone ? (
              <Pressable
                style={[styles.infoRow, styles.callRow]}
                onPress={() => Linking.openURL(`tel:${order.client_phone}`)}
              >
                <Text style={styles.infoIcon}>📞</Text>
                <Text style={[styles.infoText, { color: BLUE, fontWeight: '700' }]}>{order.client_phone}</Text>
                <View style={styles.callBadge}><Text style={styles.callBadgeText}>Appeler</Text></View>
              </Pressable>
            ) : null}
            {order.client_email ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📧</Text>
                <Text style={styles.infoText}>{order.client_email}</Text>
              </View>
            ) : null}
            {order.payment_method ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>💰</Text>
                <Text style={styles.infoText}>{PAYMENT_LABELS[order.payment_method] ?? order.payment_method}</Text>
              </View>
            ) : null}
          </View>

          {/* ── Notes / observations ── */}
          {(order.notes || order.access_info) ? (
            <>
              <View style={styles.divider} />
              <View style={styles.notesSection}>
                <Text style={styles.notesSectionTitle}>📝 Observations</Text>
                {order.notes ? <Text style={styles.notesText}>{order.notes}</Text> : null}
                {order.access_info ? (
                  <View style={styles.accessRow}>
                    <Text style={styles.accessIcon}>🔑</Text>
                    <Text style={styles.notesText}>{order.access_info}</Text>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}

          {/* ── Prix ── */}
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>Votre part (65%)</Text>
              <Text style={styles.priceValue}>{(order.price_total * 0.65).toFixed(2)} €</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.priceLabel}>Total client</Text>
              <Text style={[styles.priceValue, { color: '#6B7280', fontSize: 15 }]}>{order.price_total.toFixed(2)} €</Text>
            </View>
            {order.express && <View style={styles.expressBadge}><Text style={styles.expressText}>EXPRESS</Text></View>}
          </View>
        </>
      ) : (
        <Text style={styles.notesText}>Détails non disponibles</Text>
      )}

      {/* ── Boutons navigation ── */}
      <View style={styles.mapsBtnRow}>
        {pickupUrl ? (
          <Pressable style={[styles.mapsBtn, styles.mapsBtnPickup]} onPress={() => Linking.openURL(pickupUrl)}>
            <Text style={styles.mapsBtnText}>📍 Aller chercher</Text>
          </Pressable>
        ) : null}
        {dropoffUrl ? (
          <Pressable style={[styles.mapsBtn, styles.mapsBtnDropoff]} onPress={() => Linking.openURL(dropoffUrl)}>
            <Text style={styles.mapsBtnText}>🏠 Livrer</Text>
          </Pressable>
        ) : null}
      </View>

      {/* ── Actions selon statut ── */}
      {assignment.status === 'assigned' && (
        <View style={styles.actions}>
          <Pressable style={[styles.actionBtn, styles.refuseBtn]} onPress={() => onRefuse(assignment.id)}>
            <Text style={styles.refuseBtnText}>Refuser</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, styles.acceptBtn]} onPress={() => onAccept(assignment.id)}>
            <Text style={styles.acceptBtnText}>Accepter</Text>
          </Pressable>
        </View>
      )}

      {assignment.status === 'acceptee' && (
        <Pressable
          style={[styles.actionBtn, styles.finishBtn, { marginTop: 14 }]}
          onPress={() => onFinish(assignment.id)}
        >
          <Text style={styles.acceptBtnText}>✅ Terminer la mission</Text>
        </Pressable>
      )}
    </View>
  );
}

/* ---- Modale de clôture ---- */
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://ilestchouette-sap.vercel.app';

type FinishStep = 'form' | 'signature';

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
  const [step, setStep] = useState<FinishStep>('form');
  const [code, setCode] = useState('');
  const [payment, setPayment] = useState<'cash' | 'card' | 'to_pay' | 'online' | ''>('');
  const [wantsInvoice, setWantsInvoice] = useState<'yes' | 'no' | ''>('');
  const [, setSignature] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sigRef = useRef<any>(null);

  function handleValidateForm() {
    if (validationCode && code !== validationCode) {
      setError('Code de validation incorrect.');
      return;
    }
    if (!payment) { setError('Choisis le mode de paiement.'); return; }
    if (wantsInvoice === '') { setError('Indique si le client souhaite une facture.'); return; }
    setError('');
    setStep('signature');
  }

  async function handleFinish(sig: string) {
    setLoading(true);
    const wantsInvoiceBool = wantsInvoice === 'yes';

    // 1. Uploader la signature dans Supabase Storage
    let signatureUrl: string | null = null;
    try {
      const base64Data = sig.replace(/^data:image\/png;base64,/, '');
      const byteCharacters = atob(base64Data);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: 'image/png' });
      const storagePath = `signatures/${assignmentId}.png`;
      const { error: uploadErr } = await supabase.storage
        .from('signatures')
        .upload(storagePath, blob, { upsert: true, contentType: 'image/png' });
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('signatures').getPublicUrl(storagePath);
        signatureUrl = urlData.publicUrl;
      }
    } catch (e) {
      console.warn('Erreur upload signature:', e);
    }

    // 2. Mettre à jour l'assignment
    const { error: err1 } = await supabase
      .from('assignments')
      .update({
        status: 'terminee',
        payment_method: payment,
        validated_with_code: !!code,
        signature_url: signatureUrl,
      })
      .eq('id', assignmentId);

    if (err1) { setError('Erreur lors de la clôture.'); setLoading(false); return; }

    // 3. Mettre à jour la commande
    await supabase
      .from('orders')
      .update({ status: 'terminee', wants_invoice: wantsInvoiceBool })
      .eq('id', orderId);

    // 4. Enregistrer l'événement
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

    if (wantsInvoiceBool) {
      Linking.openURL(`${WEB_URL}/operateur/facture/${orderId}`);
    }
    onDone();
  }

  const PAYMENTS: { key: 'cash' | 'card' | 'to_pay' | 'online'; label: string }[] = [
    { key: 'online', label: '✅ Payé en ligne' },
    { key: 'cash', label: '💵 Espèces' },
    { key: 'card', label: '💳 Carte CB' },
    { key: 'to_pay', label: '🔄 À facturer' },
  ];

  /* ── Étape 1 : Formulaire ── */
  if (step === 'form') {
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
                ✅ Oui
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
            <Text style={styles.invoiceHint}>La facture s'ouvrira dans le navigateur après confirmation.</Text>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable style={[styles.actionBtn, styles.refuseBtn]} onPress={onClose}>
              <Text style={styles.refuseBtnText}>Annuler</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.acceptBtn]} onPress={handleValidateForm}>
              <Text style={styles.acceptBtnText}>Suivant →</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  /* ── Étape 2 : Signature ── */
  return (
    <View style={styles.overlay}>
      <View style={[styles.modal, { paddingBottom: 8 }]}>
        <Text style={styles.modalTitle}>✍️ Signature du client</Text>
        <Text style={styles.signatureHint}>Demandez au client de signer ci-dessous pour confirmer la réception</Text>

        <View style={styles.signatureBox}>
          <SignatureCanvas
            ref={sigRef}
            onOK={(sig) => {
              setSignature(sig);
              handleFinish(sig);
            }}
            onEmpty={() => setError('Veuillez obtenir la signature du client.')}
            descriptionText=""
            clearText="Effacer"
            confirmText={loading ? 'Enregistrement…' : 'Confirmer'}
            webStyle={`
              .m-signature-pad { box-shadow: none; border: none; }
              .m-signature-pad--body { border: none; }
              .m-signature-pad--footer { background: #fff; padding: 8px; }
              .button.clear { background: #FEE2E2; color: #DC2626; border-radius: 8px; font-weight: 700; }
              .button.save { background: #16A34A; color: #fff; border-radius: 8px; font-weight: 700; }
            `}
          />
        </View>

        {error ? <Text style={[styles.error, { marginBottom: 8 }]}>{error}</Text> : null}

        <Pressable style={[styles.actionBtn, styles.refuseBtn, { marginTop: 4 }]} onPress={() => { setStep('form'); setError(''); }}>
          <Text style={styles.refuseBtnText}>← Retour</Text>
        </Pressable>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={GREEN} />
            <Text style={{ color: '#fff', marginTop: 8, fontWeight: '700' }}>Enregistrement…</Text>
          </View>
        )}
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

  // Charger les IDs passés depuis AsyncStorage au démarrage
  useEffect(() => {
    AsyncStorage.getItem('skipped_orders').then((val) => {
      if (val) {
        const parsed: string[] = JSON.parse(val);
        setSkippedIds(new Set(parsed));
      }
    });
  }, []);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [courierEmail, setCourierEmail] = useState('');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20_000);

    // Recharger quand l'app revient au premier plan
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') loadData();
    });

    return () => {
      clearInterval(interval);
      appStateSub.remove();
    };
  }, []);

  async function loadData() {
    const { data: sessionData } = await supabase.auth.getSession();
    const userEmail = sessionData.session?.user?.email ?? '';
    setCourierEmail(userEmail);

    // Mes missions + commandes actives en parallèle
    const [myAssignmentsRes, activeAssignmentsRes] = await Promise.all([
      supabase
        .from('assignments')
        .select('*, order:orders(id,service_type,pickup_address,pickup_place_name,dropoff_address,notes,access_info,price_total,express,created_at,scheduled_at,validation_code,status,wants_invoice,extra_stops,client_email,client_name,client_phone,payment_method)')
        .eq('courier_email', userEmail)
        .in('status', ['assigned', 'acceptee'])
        .order('assigned_at', { ascending: false }),
      supabase
        .from('assignments')
        .select('order_id')
        .in('status', ['assigned', 'acceptee']),
    ]);

    if (myAssignmentsRes.data) setAssignments(myAssignmentsRes.data as Assignment[]);

    const takenOrderIds = (activeAssignmentsRes.data ?? []).map((a: any) => a.order_id);

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
                  <Text style={styles.availableTime}>
                    🕐 {o.scheduled_at
                      ? `Planifié : ${formatDate(o.scheduled_at)}`
                      : `Reçue : ${formatDate(o.created_at)}`}
                  </Text>
                  {o.pickup_address ? <Text style={styles.availableAddr}>📍 Depuis : {o.pickup_address}</Text> : null}
                  <Text style={styles.availableAddr}>🏠 Vers : {o.dropoff_address}</Text>
                  {o.notes ? <Text style={styles.availableNotes}>{o.notes}</Text> : null}
                  <View style={styles.availableBtns}>
                    <Pressable style={styles.skipBtn} onPress={() => {
                      const next = new Set([...skippedIds, o.id]);
                      setSkippedIds(next);
                      AsyncStorage.setItem('skipped_orders', JSON.stringify([...next]));
                    }}>
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
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // Bandeau planifié
  scheduledBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  scheduledText: { fontSize: 13, fontWeight: '700', color: '#92400E' },

  // Header service + statut
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  serviceLabel: { fontSize: 17, fontWeight: '800', color: '#1F2937', flex: 1, marginRight: 8 },
  cardDate: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  // Séparateur
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },

  // Adresses
  addressBlock: { gap: 10 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 11, height: 11, borderRadius: 6, marginTop: 5 },
  addressLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 1 },
  addressText: { fontSize: 15, color: '#1F2937', fontWeight: '500', lineHeight: 20 },

  // Infos client
  infoSection: { gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  callRow: { backgroundColor: '#EFF6FF', borderRadius: 10, padding: 8 },
  callBadge: { backgroundColor: BLUE, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  callBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  infoIcon: { fontSize: 16, width: 24 },
  infoText: { fontSize: 14, color: '#374151', flex: 1 },

  // Notes
  notesSection: { gap: 6 },
  notesSectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 2 },
  notesText: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  accessRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  accessIcon: { fontSize: 14 },

  // Prix
  priceRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  priceLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginBottom: 2 },
  priceValue: { fontSize: 22, fontWeight: '800', color: GREEN },
  expressBadge: { backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  expressText: { fontSize: 11, fontWeight: '700', color: '#92400E' },

  // Navigation
  mapsBtnRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  mapsBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  mapsBtnPickup: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  mapsBtnDropoff: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  mapsBtnText: { fontSize: 13, fontWeight: '600', color: BLUE },

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
  signatureHint: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 12 },
  signatureBox: { height: 260, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  sectionHeader: { paddingHorizontal: 4, paddingTop: 8, paddingBottom: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
  availableCard: { backgroundColor: '#FFF7ED', borderRadius: 14, padding: 14, borderWidth: 2, borderColor: '#F97316', gap: 6, marginBottom: 4 },
  availableTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  availableService: { fontSize: 15, fontWeight: '800', color: '#EA580C' },
  availablePrice: { fontSize: 16, fontWeight: '800', color: '#EA580C' },
  availableTime: { fontSize: 12, color: '#1B5E9B', fontWeight: '600', marginBottom: 2 },
  availableAddr: { fontSize: 13, color: '#374151' },
  availableNotes: { fontSize: 12, color: '#6B7280', fontStyle: 'italic' },
  claimBtn: { flex: 1, backgroundColor: '#F97316', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  claimBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  availableBtns: { flexDirection: 'row', gap: 8, marginTop: 6 },
  skipBtn: { paddingHorizontal: 16, borderRadius: 10, paddingVertical: 11, alignItems: 'center', borderWidth: 1.5, borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  skipBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 14 },
});
