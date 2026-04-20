import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ORANGE, ORANGE_LIGHT, GRAY_500 } from '@/constants/theme';

export type ShoppingItem = { name: string; brand?: string; quantity: number };

type OFFProduct = { product_name: string; brands?: string; code: string };

export function ShoppingListPicker({
  items,
  onChange,
}: {
  items: ShoppingItem[];
  onChange: (items: ShoppingItem[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OFFProduct[]>([]);
  const [searching, setSearching] = useState(false);

  async function search() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&json=1&page_size=8&fields=product_name,brands,code&search_simple=1&lc=fr&cc=fr`
      );
      const data = await res.json();
      const filtered = (data.products ?? []).filter((p: OFFProduct) => p.product_name?.trim());
      setResults(filtered.slice(0, 8));
    } catch {
      // silently ignore network error
    } finally {
      setSearching(false);
    }
  }

  function addProduct(p: OFFProduct) {
    const name = p.product_name.trim();
    const brand = p.brands?.split(',')[0]?.trim();
    const idx = items.findIndex(i => i.name === name);
    if (idx >= 0) {
      onChange(items.map((i, index) => index === idx ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      onChange([...items, { name, brand, quantity: 1 }]);
    }
    setResults([]);
    setQuery('');
  }

  function updateQty(idx: number, delta: number) {
    const updated = items
      .map((i, index) => index === idx ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0);
    onChange(updated);
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>🛒 Liste de courses</Text>

      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Chercher un produit..."
          placeholderTextColor="#9CA3AF"
          returnKeyType="search"
          onSubmitEditing={search}
          blurOnSubmit={false}
        />
        <Pressable style={s.searchBtn} onPress={search} disabled={searching}>
          <Text style={s.searchBtnText}>{searching ? '…' : '🔍'}</Text>
        </Pressable>
      </View>

      {searching && <ActivityIndicator size="small" color={ORANGE} style={{ marginVertical: 8 }} />}

      {results.length > 0 && (
        <View style={s.resultsList}>
          {results.map(p => (
            <Pressable key={p.code} style={s.resultItem} onPress={() => addProduct(p)}>
              <Text style={s.resultName} numberOfLines={1}>{p.product_name}</Text>
              {p.brands ? <Text style={s.resultBrand} numberOfLines={1}>{p.brands.split(',')[0]}</Text> : null}
            </Pressable>
          ))}
        </View>
      )}

      {items.length > 0 && (
        <View style={s.itemsList}>
          {items.map((item, idx) => (
            <View key={idx} style={s.listItem}>
              <View style={s.listItemInfo}>
                <Text style={s.listItemName} numberOfLines={1}>{item.name}</Text>
                {item.brand ? <Text style={s.listItemBrand}>{item.brand}</Text> : null}
              </View>
              <View style={s.qtyRow}>
                <Pressable style={s.qtyBtn} onPress={() => updateQty(idx, -1)}>
                  <Text style={s.qtyBtnText}>−</Text>
                </Pressable>
                <Text style={s.qtyText}>{item.quantity}</Text>
                <Pressable style={s.qtyBtn} onPress={() => updateQty(idx, 1)}>
                  <Text style={s.qtyBtnText}>+</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {items.length === 0 && results.length === 0 && !searching && (
        <Text style={s.emptyText}>Recherchez des produits pour les ajouter à votre liste</Text>
      )}
    </View>
  );
}

export function formatShoppingList(items: ShoppingItem[]): string {
  if (items.length === 0) return '';
  const lines = items.map(i => `• ${i.quantity}x ${i.name}${i.brand ? ` (${i.brand})` : ''}`);
  return `Liste de courses :\n${lines.join('\n')}`;
}

const s = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    marginTop: 8,
    gap: 8,
  },
  title: { fontSize: 13, fontWeight: '700', color: '#111827' },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
  },
  searchBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: ORANGE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: { fontSize: 16 },
  resultsList: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
  },
  resultItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  resultName: { fontSize: 13, color: '#111827', fontWeight: '500' },
  resultBrand: { fontSize: 11, color: GRAY_500, marginTop: 1 },
  itemsList: { gap: 6 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  listItemInfo: { flex: 1 },
  listItemName: { fontSize: 13, color: '#111827', fontWeight: '500' },
  listItemBrand: { fontSize: 11, color: GRAY_500 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 20 },
  qtyText: { fontSize: 14, fontWeight: '700', color: '#111827', minWidth: 16, textAlign: 'center' },
  emptyText: { fontSize: 12, color: GRAY_500, textAlign: 'center', paddingVertical: 8 },
});
