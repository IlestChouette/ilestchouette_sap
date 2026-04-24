import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useStripe } from '@stripe/stripe-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { ORANGE, ORANGE_LIGHT, ORANGE_DARK, GRAY_500, BG } from '@/constants/theme';

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };

type SingleOrder = {
  service_id: string;
  merchant_id?: string | null;
  pickup_address?: string;
  dropoff_address: string;
  notes?: string;
  price_items?: number;
  price_total: number;
  hours?: number;
  is_asap: boolean;
  scheduled_at?: string | null;
  payment_method: 'online_card' | 'on_site_cash' | 'on_site_card';
};

type OrderAction = {
  type: 'create_orders';
  orders: SingleOrder[];
};

const SERVICE_LABELS: Record<string, string> = {
  supermarket: '🛒 Courses supermarché',
  meds: '💊 Pharmacie',
  food: '🍕 Livraison repas',
  keys: '🗝️ Clés / documents',
  shopping: '🛍️ Shopping',
  voiturier: '🚗 Voiturier',
  it: '💻 Soutien informatique',
  assist: '🤝 Assistance',
  bricolage: '🔧 Bricolage',
  other: '📋 Autre — sur devis',
};

export default function CommanderScreen() {
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const flatListRef = useRef<FlatList>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDoneRef = useRef(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<OrderAction | null>(null);
  const [placing, setPlacing] = useState(false);
  const [done, setDone] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [savedAddresses, setSavedAddresses] = useState('');
  const [merchants, setMerchants] = useState<any[]>([]);
  const merchantsRef = useRef<any[]>([]);
  const clientLocationRef = useRef<{ lat: number; lon: number } | null>(null);

  // Détecte si un nouveau service a été sélectionné depuis l'accueil.
  // Si oui : réinitialise la conversation. Sinon : charge une seule fois au premier affichage.
  useFocusEffect(
    useCallback(() => {
      async function checkAndStart() {
        const pending = await AsyncStorage.getItem('pending_service');
        if (pending) {
          // Nouveau service sélectionné → on repart de zéro
          setMessages([]);
          setPendingAction(null);
          setDone(false);
          initialLoadDoneRef.current = false;
          loadAndStart();
        } else if (!initialLoadDoneRef.current) {
          // Premier affichage sans service spécifique
          initialLoadDoneRef.current = true;
          loadAndStart();
        }
        // Retour en cours de conversation → on ne touche à rien
      }
      checkAndStart();
    }, [])
  );

  useEffect(() => {
    if (messages.length > 0) {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);
    }
    return () => { if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current); };
  }, [messages, loading]);

  async function loadAndStart() {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const user = session.session?.user;
      const email = user?.email ?? '';
      setUserEmail(email);

      let name = email.split('@')[0];
      let addrStr = '';

      if (user?.id) {
        const [{ data: profile }, { data: addresses }] = await Promise.all([
          supabase.from('profiles').select('full_name, phone').eq('id', user.id).maybeSingle(),
          supabase.from('saved_addresses').select('label, address').eq('user_id', user.id),
        ]);
        if (profile?.full_name) name = profile.full_name;
        if (profile?.phone) setUserPhone(profile.phone);
        if (addresses?.length) addrStr = addresses.map((a) => `${a.label}: ${a.address}`).join(', ');
      }

      // Load active merchants + their products
      const { data: merchantList } = await supabase
        .from('merchants')
        .select('id, name, address, category, opening_hours, closed_dates, latitude, longitude')
        .eq('status', 'active');

      let merchantsWithProducts: any[] = [];
      if (merchantList && merchantList.length > 0) {
        const { data: allProducts } = await supabase
          .from('merchant_products')
          .select('merchant_id, name, description, price, category, is_featured')
          .in('merchant_id', merchantList.map((m: any) => m.id))
          .eq('available', true);

        merchantsWithProducts = merchantList.map((m: any) => ({
          ...m,
          products: (allProducts ?? []).filter((p: any) => p.merchant_id === m.id),
        }));
      }

      // Géolocalisation du client pour tri des commerçants (best-effort, pas bloquant)
      try {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => { clientLocationRef.current = { lat: pos.coords.latitude, lon: pos.coords.longitude }; resolve(); },
            () => resolve(),
            { timeout: 3000, maximumAge: 60000 },
          );
        });
      } catch { /* géoloc non disponible */ }

      merchantsRef.current = merchantsWithProducts;
      setMerchants(merchantsWithProducts);
      setUserName(name);
      setSavedAddresses(addrStr);

      // Check if user came from a service shortcut
      const pendingService = await AsyncStorage.getItem('pending_service');
      let initialMessages: { role: string; content: string }[] = [];
      if (pendingService) {
        await AsyncStorage.removeItem('pending_service');
        try {
          const svc = JSON.parse(pendingService);
          if (svc.merchant_name) {
            // Came from a merchant banner — jump straight to that merchant
            initialMessages = [{ role: 'user', content: `Je voudrais commander chez ${svc.merchant_name}` }];
          } else {
            const serviceLabel = SERVICE_LABELS[svc.id] ?? svc.id;
            initialMessages = [{ role: 'user', content: `Je voudrais: ${serviceLabel}` }];
          }
        } catch {}
      }

      await callAgent(initialMessages, name, addrStr, merchantsWithProducts);
    } catch (e) {
      setLoading(false);
      const errMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '⚠️ Impossible de démarrer. Vérifie ta connexion et réessaie.',
      };
      setMessages([errMsg]);
    }
  }

  async function callAgent(
    apiMessages: { role: string; content: string }[],
    name: string,
    addresses: string,
    merchantList?: any[],
  ) {
    try {
      const loc = clientLocationRef.current;
      const { data, error } = await supabase.functions.invoke('chat-agent', {
        body: {
          messages: apiMessages,
          language: i18n.language,
          userName: name,
          savedAddresses: addresses,
          merchants: merchantList ?? merchantsRef.current,
          clientLat: loc?.lat,
          clientLon: loc?.lon,
        },
      });
      if (error) {
        let details = error.message ?? 'inconnu';
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) details = body.error;
        } catch {}
        const errMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `⚠️ ${details}`,
        };
        setMessages((prev) => [...prev, errMsg]);
      } else if (!data) {
        const errMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '⚠️ Réponse vide de l\'agent (data null)',
        };
        setMessages((prev) => [...prev, errMsg]);
      } else if (data?.reply) {
        const msg: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.reply,
        };
        setMessages((prev) => {
          if (apiMessages.length > 0 && prev.length === 0) {
            const userMsgs: ChatMessage[] = apiMessages.map((m, i) => ({
              id: `init-${i}`,
              role: m.role as 'user' | 'assistant',
              content: m.content,
            }));
            return [...userMsgs, msg];
          }
          return [...prev, msg];
        });
        if (data.action) setPendingAction(data.action);
      } else if (data?.error) {
        const errMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `⚠️ Erreur agent : ${data.error}`,
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } catch (e) {
      const errMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `⚠️ Exception : ${String(e)}`,
      };
      setMessages((prev) => [...prev, errMsg]);
    }
    setLoading(false);
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    const apiMessages = newMessages.map((m) => ({ role: m.role, content: m.content }));
    await callAgent(apiMessages, userName, savedAddresses, merchants);
  }

  async function handleConfirmOrder() {
    if (!pendingAction) return;
    const hasOnlinePayment = pendingAction.orders.some(o => o.payment_method === 'online_card');
    if (hasOnlinePayment) {
      await handleStripePayment();
    } else {
      await placeOrders(null);
    }
  }

  async function handleStripePayment() {
    setPlacing(true);
    try {
      const totalCents = Math.round(
        pendingAction!.orders.reduce((sum, o) => sum + o.price_total, 0) * 100
      );
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { amount: totalCents, currency: 'eur' },
      });
      if (error || !data?.clientSecret) {
        Alert.alert('Erreur', 'Paiement impossible, réessayez');
        setPlacing(false);
        return;
      }
      const grandTotal = (totalCents / 100).toFixed(2);
      const { error: initErr } = await initPaymentSheet({
        paymentIntentClientSecret: data.clientSecret,
        merchantDisplayName: 'Il est chouette',
        style: 'alwaysLight',
        primaryButtonLabel: `Payer ${grandTotal} €`,
        applePay: { merchantCountryCode: 'FR' },
        googlePay: { merchantCountryCode: 'FR', testEnv: false },
      });
      if (initErr) { Alert.alert('Erreur paiement', initErr.message); setPlacing(false); return; }
      const { error: payErr } = await presentPaymentSheet();
      if (payErr) {
        if (payErr.code !== 'Canceled') {
          Alert.alert('Paiement échoué', payErr.message);
        }
        setPlacing(false);
        return;
      }
      await placeOrders(data.paymentIntentId);
    } catch {
      Alert.alert('Erreur', 'Paiement impossible, réessayez');
      setPlacing(false);
    }
  }

  async function placeOrders(stripeIntentId: string | null) {
    setPlacing(true);
    const orders = pendingAction!.orders;
    const rows = orders.map(o => {
      const priceItems = ['meds', 'food', 'shopping'].includes(o.service_id)
        ? (o.price_items ?? 0)
        : 0;
      return {
        client_email: userEmail || null,
        client_name: userName || null,
        client_phone: userPhone || null,
        service_type: o.service_id,
        pickup_address: o.pickup_address ?? null,
        dropoff_address: o.dropoff_address,
        notes: o.notes || null,
        shopping_list: null,
        price_total: o.price_total,
        price_items: priceItems,
        status: 'pending',
        scheduled_at: o.scheduled_at ?? null,
        payment_method: o.payment_method,
        payment_status: stripeIntentId ? 'paid' : 'pending',
        stripe_payment_intent_id: stripeIntentId,
        validation_code: String(Math.floor(100000 + Math.random() * 900000)),
      };
    });

    const { data: insertedOrders, error } = await supabase.from('orders').insert(rows).select('id');
    if (error) {
      Alert.alert('Erreur', 'Commande non créée, réessayez');
      setPlacing(false);
      return;
    }

    // Lier les commandes commerçant dans merchant_orders
    if (insertedOrders) {
      const merchantLinks = orders
        .map((o, i) => o.merchant_id ? { merchant_id: o.merchant_id, order_id: insertedOrders[i].id, status: 'pending' } : null)
        .filter(Boolean);
      if (merchantLinks.length > 0) {
        await supabase.from('merchant_orders').insert(merchantLinks);
      }
    }

    // Notify admin for each order
    orders.forEach(o => {
      supabase.functions.invoke('notify-new-order', { body: { ...o, service_type: o.service_id, client_email: userEmail } });
    });

    setDone(true);
    setPlacing(false);
    setPendingAction(null);
  }

  function resetChat() {
    if (messages.length > 0 && !done) {
      Alert.alert(
        'Nouvelle commande',
        'Voulez-vous annuler la commande en cours et en démarrer une nouvelle ?',
        [
          { text: 'Non', style: 'cancel' },
          { text: 'Oui, recommencer', style: 'destructive', onPress: () => {
            setDone(false);
            setMessages([]);
            setPendingAction(null);
            loadAndStart();
          }},
        ]
      );
    } else {
      setDone(false);
      setMessages([]);
      setPendingAction(null);
      loadAndStart();
    }
  }

  // ── Success screen ──────────────────────────────────────
  if (done) {
    return (
      <View style={styles.successScreen}>
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.successTitle}>Commande envoyée !</Text>
        <Text style={styles.successBody}>Votre coursier va prendre en charge votre demande dans les plus brefs délais.</Text>
        <Pressable style={styles.successBtn} onPress={() => { setDone(false); setPendingAction(null); router.replace('/(tabs)/suivi'); }}>
          <Text style={styles.successBtnText}>Suivre ma commande 🚴</Text>
        </Pressable>
        <Pressable onPress={() => { setDone(false); setPendingAction(null); router.push('/'); }} style={{ marginTop: 16 }}>
          <Text style={{ color: GRAY_500, fontSize: 14 }}>Retour à l'accueil</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
    >

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Il est chouette</Text>
          <Text style={styles.headerSub}>Assistant disponible</Text>
        </View>
        <View style={styles.onlineDot} />
      </View>

      {/* Chat */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.chatContainer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        renderItem={({ item }) => (
          <View style={[styles.row, item.role === 'user' ? styles.rowUser : styles.rowAgent]}>
            {item.role === 'assistant' && (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>🤝</Text>
              </View>
            )}
            <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAgent]}>
              <Text style={[styles.bubbleText, item.role === 'user' && styles.bubbleTextUser]}>
                {item.content}
              </Text>
            </View>
          </View>
        )}
        ListHeaderComponent={
          messages.length === 0 && !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🤝</Text>
              <Text style={styles.emptyText}>Connexion à l'assistant...</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <>
            {loading && (
              <View style={[styles.row, styles.rowAgent]}>
                <View style={styles.avatar}><Text style={styles.avatarText}>🤝</Text></View>
                <View style={[styles.bubble, styles.bubbleAgent, { paddingVertical: 14 }]}>
                  <ActivityIndicator size="small" color={GRAY_500} />
                </View>
              </View>
            )}

            {pendingAction && !loading && (() => {
              const grandTotal = pendingAction.orders.reduce((s, o) => s + o.price_total, 0);
              const hasOnline = pendingAction.orders.some(o => o.payment_method === 'online_card');
              return (
                <View style={styles.confirmCard}>
                  <Text style={styles.confirmHeader}>
                    {pendingAction.orders.length > 1
                      ? `Récapitulatif — ${pendingAction.orders.length} services`
                      : 'Récapitulatif de votre commande'}
                  </Text>
                  {pendingAction.orders.map((o, i) => (
                    <View key={i} style={styles.confirmServiceBlock}>
                      {pendingAction.orders.length > 1 && (
                        <Text style={styles.confirmServiceTitle}>
                          {`${i + 1}. ${SERVICE_LABELS[o.service_id] ?? o.service_id}`}
                        </Text>
                      )}
                      <View style={styles.confirmRows}>
                        {pendingAction.orders.length === 1 && (
                          <ConfirmRow label="Service" value={SERVICE_LABELS[o.service_id] ?? o.service_id} />
                        )}
                        {o.pickup_address ? <ConfirmRow label="Depuis" value={o.pickup_address} /> : null}
                        <ConfirmRow label="Livraison" value={o.dropoff_address} />
                        {o.notes ? <ConfirmRow label="Détails" value={o.notes} /> : null}
                        <ConfirmRow label="Horaire" value={o.is_asap ? '⚡ À faire tout de suite' : o.scheduled_at ?? 'Planifié'} />
                        {(['meds', 'food', 'shopping'].includes(o.service_id) && (o.price_items ?? 0) > 0) ? (
                          <ConfirmRow label="🛒 Articles (à payer au coursier)" value={`${(o.price_items ?? 0).toFixed(2)} €`} />
                        ) : null}
                        {o.service_id !== 'other' && (
                          <ConfirmRow label="⚡ Frais de service" value={`${(['meds', 'food', 'shopping'].includes(o.service_id) ? (o.price_total - (o.price_items ?? 0)) : o.price_total).toFixed(2)} €`} />
                        )}
                        {o.service_id === 'other' && (
                          <View style={styles.devisRow}>
                            <Text style={styles.confirmRowLabel}>💶 Prix convenu</Text>
                            <TextInput
                              style={styles.devisInput}
                              keyboardType="decimal-pad"
                              placeholder="0.00"
                              placeholderTextColor="#9CA3AF"
                              value={o.price_total > 0 ? String(o.price_total) : ''}
                              onChangeText={(v) => {
                                const val = parseFloat(v.replace(',', '.')) || 0;
                                setPendingAction(prev => prev ? {
                                  ...prev,
                                  orders: prev.orders.map((ord, idx) => idx === i ? { ...ord, price_total: val } : ord),
                                } : prev);
                              }}
                            />
                            <Text style={styles.confirmRowLabel}>€</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.confirmSubtotalRow}>
                        <Text style={styles.confirmRowLabel}>Sous-total</Text>
                        <Text style={styles.confirmSubtotalValue}>{o.price_total.toFixed(2)} €</Text>
                      </View>
                    </View>
                  ))}
                  <View style={styles.confirmTotalRow}>
                    <Text style={styles.confirmTotalLabel}>Total</Text>
                    <Text style={styles.confirmTotalValue}>{grandTotal.toFixed(2)} €</Text>
                  </View>
                  {pendingAction.orders.some(o => ['meds', 'food', 'shopping'].includes(o.service_id) && (o.price_items ?? 0) > 0) && (
                    <View style={styles.purchaseNote}>
                      <Text style={styles.purchaseNoteText}>
                        ℹ️ Les articles ({pendingAction.orders.reduce((s, o) => ['meds', 'food', 'shopping'].includes(o.service_id) ? s + (o.price_items ?? 0) : s, 0).toFixed(2)} €) sont réglés directement au coursier à la livraison. Seuls les frais de service sont facturés ici.
                      </Text>
                    </View>
                  )}
                  {pendingAction.orders.some(o => o.service_id === 'supermarket') && (
                    <View style={styles.purchaseNote}>
                      <Text style={styles.purchaseNoteText}>
                        🛒 Prévenez votre drive qu'un coursier d'Il est chouette viendra récupérer la commande en votre nom.
                      </Text>
                    </View>
                  )}
                  {pendingAction.orders.some(o => o.service_id === 'other') && (
                    <View style={styles.purchaseNote}>
                      <Text style={styles.purchaseNoteText}>
                        📋 Saisissez le prix convenu avec notre équipe dans le champ ci-dessus, puis confirmez pour procéder au paiement.
                      </Text>
                    </View>
                  )}
                  <Pressable style={styles.confirmBtn} onPress={handleConfirmOrder} disabled={placing}>
                    {placing
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.confirmBtnText}>
                          {hasOnline ? `💳 Payer ${grandTotal.toFixed(2)} €` : '✅ Confirmer la commande'}
                        </Text>}
                  </Pressable>
                  <Pressable onPress={() => setPendingAction(null)} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>Modifier</Text>
                  </Pressable>
                </View>
              );
            })()}
          </>
        }
      />

      {/* Input */}
      {!pendingAction && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Écrivez votre message…"
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
            returnKeyType="send"
            blurOnSubmit={Platform.OS === 'android'}
            onSubmitEditing={sendMessage}
          />
          <Pressable
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendBtnText}>➤</Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.confirmRowItem}>
      <Text style={styles.confirmRowLabel}>{label}</Text>
      <Text style={styles.confirmRowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: ORANGE,
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ADE80' },

  chatContainer: { padding: 16, paddingBottom: 24, gap: 10 },

  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  rowUser: { flexDirection: 'row-reverse' },
  rowAgent: { flexDirection: 'row' },

  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: ORANGE_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 17 },

  bubble: {
    maxWidth: '75%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 11,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  bubbleAgent: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: ORANGE, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: '#1F2937', lineHeight: 21 },
  bubbleTextUser: { color: '#fff' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 14, color: GRAY_500 },

  confirmCard: {
    backgroundColor: '#fff', borderRadius: 20, margin: 8, padding: 20,
    borderWidth: 2, borderColor: ORANGE, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  confirmHeader: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 8 },
  confirmRows: { gap: 6, marginBottom: 8 },
  confirmRowItem: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  confirmRowLabel: { fontSize: 13, color: GRAY_500, flex: 1 },
  confirmRowValue: { fontSize: 13, color: '#111827', fontWeight: '500', flex: 2, textAlign: 'right' },
  confirmServiceBlock: {
    borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10, marginTop: 6,
  },
  confirmServiceTitle: {
    fontSize: 13, fontWeight: '700', color: ORANGE, marginBottom: 6,
  },
  confirmSubtotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4,
  },
  confirmSubtotalValue: { fontSize: 13, fontWeight: '600', color: '#374151' },
  confirmTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 2, borderTopColor: ORANGE, paddingTop: 10, marginTop: 8,
  },
  confirmTotalLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  confirmTotalValue: { fontSize: 22, fontWeight: '800', color: ORANGE },
  purchaseNote: {
    backgroundColor: '#FFF7ED', borderRadius: 10, padding: 10, marginTop: 8,
    borderWidth: 1, borderColor: '#FED7AA',
  },
  purchaseNoteText: { fontSize: 12, color: '#92400E', lineHeight: 17 },
  confirmBtn: {
    backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 12,
  },
  confirmBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  cancelBtn: { alignItems: 'center', marginTop: 8, paddingVertical: 6 },
  cancelBtnText: { color: GRAY_500, fontSize: 13 },
  devisRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  devisInput: {
    flex: 1, borderWidth: 1, borderColor: ORANGE, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, fontSize: 15,
    fontWeight: '700', color: '#111827', textAlign: 'right',
  },

  inputRow: {
    flexDirection: 'row', padding: 12, paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6',
    gap: 10, alignItems: 'flex-end',
  },
  input: {
    flex: 1, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: '#111827', maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 18 },

  successScreen: {
    flex: 1, backgroundColor: BG, justifyContent: 'center',
    alignItems: 'center', padding: 32, gap: 16,
  },
  successEmoji: { fontSize: 72 },
  successTitle: { fontSize: 26, fontWeight: '800', color: '#111827' },
  successBody: { fontSize: 15, color: GRAY_500, textAlign: 'center' },
  successBtn: {
    backgroundColor: ORANGE, borderRadius: 14,
    paddingVertical: 15, paddingHorizontal: 32, marginTop: 8,
  },
  successBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
