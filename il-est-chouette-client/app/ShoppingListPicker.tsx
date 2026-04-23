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

export type ShoppingItem = {
  name: string;
  brand?: string;
  quantity: number;
  estimated_price?: number; // price per unit in €
};

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
  const [editingPriceIdx, setEditingPriceIdx] = useState<number | null>(null);
  const [priceInput, setPriceInput] = useState('');

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
      onChange([...items, { name, brand, quantity: 1, estimated_price: undefined }]);
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

  function startEditPrice(idx: number) {
    setEditingPriceIdx(idx);
    setPriceInput(items[idx].estimated_price != null ? String(items[idx].estimated_price) : '');
  }

  function confirmPrice(idx: number) {
    const val = parseFloat(priceInput.replace(',', '.'));
    onChange(items.map((i, index) =>
      index === idx ? { ...i, estimated_price: isNaN(val) || val <= 0 ? undefined : val } : i
    ));
    setEditingPriceIdx(null);
    setPriceInput('');
  }

  const estimatedTotal = items.reduce((sum, i) => {
    return sum + (i.estimated_price != null ? i.estimated_price * i.quantity : 0);
  }, 0);
  const allPriced = items.length > 0 && items.every(i => i.estimated_price != null);

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

                {/* Price input */}
                {editingPriceIdx === idx ? (
                  <View style={s.priceEditRow}>
                    <TextInput
                      style={s.priceInput}
                      value={priceInput}
                      onChangeText={setPriceInput}
                      keyboardType="decimal-pad"
                      placeholder="Prix €"
                      placeholderTextColor="#9CA3AF"
                      autoFocus
                      onSubmitEditing={() => confirmPrice(idx)}
                    />
                    <Pressable style={s.priceConfirmBtn} onPress={() => confirmPrice(idx)}>
                      <Text style={s.priceConfirmText}>✓</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={() => startEditPrice(idx)} style={s.priceTap}>
                    <Text style={[s.priceTag, item.estimated_price == null && s.priceMissing]}>
                      {item.estimated_price != null
                        ? `${item.estimated_price.toFixed(2)} € / unité`
                        : '+ Ajouter le prix estimé'}
                    </Text>
                  </Pressable>
                )}
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

          {/* Running total */}
          <View style={[s.totalRow, !allPriced && s.totalRowPartial]}>
            <Text style={s.totalLabel}>
              {allPriced ? 'Total estimé' : 'Total partiel (prix manquants)'}
            </Text>
            <Text style={s.totalValue}>
              {estimatedTotal > 0 ? `${estimatedTotal.toFixed(2)} €` : '—'}
            </Text>
          </View>
          {!allPriced && (
            <Text style={s.priceHint}>
              💡 Ajoutez un prix estimé par article — le coursier pourra le corriger en magasin
            </Text>
          )}
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
  const lines = items.map(i => {
    const price = i.estimated_price != null ? ` ~${(i.estimated_price * i.quantity).toFixed(2)}€` : '';
    return `• ${i.quantity}x ${i.name}${i.brand ? ` (${i.brand})` : ''}${price}`;
  });
  const total = items.reduce((s, i) => s + (i.estimated_price != null ? i.estimated_price * i.quantity : 0), 0);
  const totalLine = total > 0 ? `\nTotal estimé : ~${total.toFixed(2)} €` : '';
  return `Liste de courses :\n${lines.join('\n')}${totalLine}`;
}

export function calcShoppingTotal(items: ShoppingItem[]): number {
  return items.reduce((s, i) => s + (i.estimated_price ?? 0) * i.quantity, 0);
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
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  listItemInfo: { flex: 1, gap: 4 },
  listItemName: { fontSize: 13, color: '#111827', fontWeight: '500' },
  listItemBrand: { fontSize: 11, color: GRAY_500 },
  priceTap: { alignSelf: 'flex-start' },
  priceTag: { fontSize: 12, color: ORANGE, fontWeight: '600' },
  priceMissing: { color: '#9CA3AF', fontStyle: 'italic' },
  priceEditRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  priceInput: {
    width: 80,
    borderWidth: 1,
    borderColor: ORANGE,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#fff',
  },
  priceConfirmBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceConfirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4 },
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
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  totalRowPartial: { backgroundColor: '#FFF7ED' },
  totalLabel: { fontSize: 13, fontWeight: '600', color: '#065F46' },
  totalValue: { fontSize: 15, fontWeight: '800', color: '#065F46' },
  priceHint: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', fontStyle: 'italic' },
});
