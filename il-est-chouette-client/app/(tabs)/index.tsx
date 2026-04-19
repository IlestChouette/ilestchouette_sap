import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { SERVICES } from '@/lib/services';
import type { Service } from '@/lib/types';
import type { Order } from '@/lib/types';
import { ORANGE, ORANGE_LIGHT, ORANGE_BORDER, GRAY_700, GRAY_500, BG } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

type MerchantProduct = { id: string; name: string; price: number; image_url?: string; is_featured?: boolean };
type MerchantWithProducts = { id: string; name: string; category: string; address: string; products: MerchantProduct[] };

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [merchants, setMerchants] = useState<MerchantWithProducts[]>([]);

  // Rechargement à chaque fois que l'écran prend le focus (retour depuis suivi, etc.)
  useFocusEffect(
    useCallback(() => {
      async function loadUser() {
        const { data } = await supabase.auth.getSession();
        const email = data.session?.user?.email ?? '';
        setUserEmail(email);
        if (email) loadActiveOrder(email);
      }
      loadUser();
      loadMerchants();
    }, [])
  );

  async function loadMerchants() {
    const { data: merchantList } = await supabase
      .from('merchants')
      .select('id, name, category, address')
      .eq('status', 'active');
    if (!merchantList?.length) return;

    const { data: products } = await supabase
      .from('merchant_products')
      .select('id, merchant_id, name, price, image_url, is_featured')
      .in('merchant_id', merchantList.map((m: any) => m.id))
      .eq('available', true);

    setMerchants(merchantList.map((m: any) => ({
      ...m,
      products: (products ?? []).filter((p: any) => p.merchant_id === m.id),
    })));
  }

  async function loadActiveOrder(email: string) {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('client_email', email)
      .not('status', 'in', '("terminee","annulee")')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setActiveOrder(data as Order);
  }

  function handleService(service: Service) {
    AsyncStorage.setItem('pending_service', JSON.stringify(service));
    router.push('/commander');
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('@/assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
        <View>
          <Text style={styles.headerTitle}>{t('home.title')}</Text>
          <Text style={styles.headerSub}>{t('home.subtitle')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Bannière commande active */}
        {activeOrder && (
          <Pressable style={styles.activeBanner} onPress={() => router.replace('/(tabs)/suivi')}>
            <Text style={styles.activeBannerEmoji}>🚴</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeBannerTitle}>{t('home.active_order')}</Text>
              <Text style={styles.activeBannerSub}>{activeOrder.dropoff_address}</Text>
            </View>
            <Text style={styles.activeBannerArrow}>{t('home.view_order')}</Text>
          </Pressable>
        )}

        {/* Section partenaires avec photos */}
        {merchants.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏪 Nos partenaires</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={merchants}
              keyExtractor={(m) => m.id}
              contentContainerStyle={{ gap: 12 }}
              renderItem={({ item: m }) => {
                const featured = m.products.filter((p) => p.is_featured);
                const shown = featured.length > 0 ? featured : m.products.slice(0, 4);
                return (
                  <Pressable
                    style={styles.merchantCard}
                    onPress={() => {
                      AsyncStorage.setItem('pending_service', JSON.stringify({ id: 'food', label: m.name }));
                      router.push('/commander');
                    }}
                  >
                    <Text style={styles.merchantName}>{m.name}</Text>
                    <Text style={styles.merchantCat}>{m.category}</Text>
                    {shown.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }} contentContainerStyle={{ gap: 8 }}>
                        {shown.map((p) => (
                          <View key={p.id} style={styles.productThumb}>
                            {p.image_url ? (
                              <Image source={{ uri: p.image_url }} style={styles.productImg} />
                            ) : (
                              <View style={[styles.productImg, styles.productImgPlaceholder]}>
                                <Text style={{ fontSize: 20 }}>🍽️</Text>
                              </View>
                            )}
                            <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                            <Text style={styles.productPrice}>{p.price.toFixed(2)} €</Text>
                          </View>
                        ))}
                      </ScrollView>
                    )}
                    <View style={styles.orderBtn}>
                      <Text style={styles.orderBtnText}>Commander →</Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>
        )}

        {/* Grille de services */}
        <View style={styles.grid}>
          {SERVICES.map((service) => (
            <Pressable
              key={service.id}
              style={({ pressed }) => [styles.serviceCard, pressed && styles.serviceCardPressed]}
              onPress={() => handleService(service)}
            >
              <Text style={styles.serviceEmoji}>{service.emoji}</Text>
              <Text style={styles.serviceLabel}>{t(service.labelKey)}</Text>
              <Text style={styles.serviceDesc}>{t(service.descKey)}</Text>
              <View style={styles.priceTag}>
                <Text style={styles.priceText}>
                  {service.type === 'hour'
                    ? `${service.base} €/h`
                    : `dès ${service.base} €`}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Footer contact */}
        <View style={styles.contactBox}>
          <Text style={styles.contactText}>📞 06 95 42 73 12</Text>
          <Text style={styles.contactSub}>Besoin d'aide ? Appelez-nous !</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ORANGE,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 14,
  },
  logo: { width: 44, height: 44, borderRadius: 10 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ORANGE_LIGHT,
    borderWidth: 1.5,
    borderColor: ORANGE_BORDER,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  activeBannerEmoji: { fontSize: 28 },
  activeBannerTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  activeBannerSub: { fontSize: 12, color: '#B45309', marginTop: 2 },
  activeBannerArrow: { fontSize: 12, color: ORANGE, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  serviceCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    gap: 6,
  },
  serviceCardPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  serviceEmoji: { fontSize: 32 },
  serviceLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  serviceDesc: { fontSize: 11, color: GRAY_500 },
  priceTag: { backgroundColor: ORANGE_LIGHT, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4 },
  priceText: { fontSize: 11, fontWeight: '700', color: ORANGE },
  contactBox: { backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', gap: 4, marginTop: 4 },
  contactText: { fontSize: 18, fontWeight: '700', color: '#111827' },
  contactSub: { fontSize: 12, color: GRAY_500 },

  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  merchantCard: {
    width: 260, backgroundColor: '#fff', borderRadius: 18, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  merchantName: { fontSize: 15, fontWeight: '800', color: '#111827' },
  merchantCat: { fontSize: 11, color: GRAY_500, marginTop: 2 },
  productThumb: { width: 90, alignItems: 'center', gap: 4 },
  productImg: { width: 90, height: 70, borderRadius: 10, overflow: 'hidden' },
  productImgPlaceholder: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: 11, fontWeight: '600', color: '#374151', textAlign: 'center' },
  productPrice: { fontSize: 11, fontWeight: '700', color: ORANGE },
  orderBtn: { backgroundColor: ORANGE_LIGHT, borderRadius: 10, paddingVertical: 8, alignItems: 'center', marginTop: 10 },
  orderBtnText: { fontSize: 12, fontWeight: '700', color: ORANGE },
});
