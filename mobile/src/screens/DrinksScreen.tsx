import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api';
import { Drink } from '../types';
import { theme, spacing } from '../theme';
import DrinkCard from '../components/DrinkCard';

type Item = { kind: 'header'; title: string } | { kind: 'drink'; drink: Drink };

export default function DrinksScreen() {
  const navigation = useNavigation<any>();
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [network, setNetwork] = useState<Drink[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    setError('');
    try {
      const local: any = await api.drinks(q ? { q, limit: 50 } : { limit: 50 });
      setDrinks(local);
      if (q) {
        const net: any = await api.drinksNetwork(q);
        setNetwork(net || []);
        setSearched(true);
      } else {
        setNetwork([]);
        setSearched(false);
      }
    } catch (e: any) { setError(e.message || '加载失败'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const doSearch = () => load(search.trim() || undefined);

  const items: Item[] = [];
  if (drinks.length > 0) {
    items.push({ kind: 'header', title: searched ? '内置酒库' : '全部酒品' });
    drinks.forEach((d) => items.push({ kind: 'drink', drink: d }));
  }
  if (network.length > 0) {
    items.push({ kind: 'header', title: '网络酒库（TheCocktailDB · 600+ 款）' });
    network.forEach((d) => items.push({ kind: 'drink', drink: d }));
  }

  return (
    <View style={styles.container}>
      <View style={styles.headRow}>
        <Text style={styles.title}>酒库</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MyLibrary')} style={styles.mineBtn}><Text style={styles.mineText}>⭐ 我的酒库</Text></TouchableOpacity>
      </View>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索酒名 / 原料（可搜全网 600+ 款）"
          placeholderTextColor={theme.colors.muted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={doSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={doSearch}><Text style={styles.searchBtnText}>搜索</Text></TouchableOpacity>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(it) => (it.kind === 'header' ? 'h-' + it.title : it.drink.id)}
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <Text style={styles.section}>{item.title}</Text>
          ) : (
            <DrinkCard drink={item.drink} onPress={() => navigation.navigate('DrinkDetail', { id: item.drink.id, drink: item.drink })} />
          )
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{loading ? '加载中…' : '没有找到相关酒品'}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, paddingTop: spacing(6) },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing(5) },
  title: { fontSize: 28, fontWeight: '800', color: theme.colors.text },
  mineBtn: { backgroundColor: theme.colors.card, borderRadius: 999, paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderWidth: 1, borderColor: theme.colors.border },
  mineText: { fontSize: 14, fontWeight: '700', color: theme.colors.primaryDark },
  searchRow: { flexDirection: 'row', gap: spacing(2), paddingHorizontal: spacing(5), marginTop: spacing(4), marginBottom: spacing(3) },
  searchInput: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: spacing(3), color: theme.colors.text, fontSize: 15, backgroundColor: theme.colors.card },
  searchBtn: { backgroundColor: theme.colors.text, borderRadius: 12, paddingHorizontal: spacing(4), justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  error: { color: theme.colors.danger, fontSize: 13, paddingHorizontal: spacing(5) },
  section: { fontSize: 14, fontWeight: '700', color: theme.colors.primaryDark, marginTop: spacing(2), paddingHorizontal: spacing(5) },
  list: { paddingHorizontal: spacing(5), paddingBottom: spacing(10), gap: spacing(3) },
  empty: { color: theme.colors.muted, fontSize: 14, textAlign: 'center', marginTop: spacing(8) },
});
