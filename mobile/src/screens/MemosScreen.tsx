import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../api';
import { Memo } from '../types';
import { localDateStr } from '../dates';
import { theme, spacing } from '../theme';

const BARS = ['#E07A5F', '#C2410C', '#0E7490', '#7C3AED', '#15803D', '#BE185D'];

function yday(): string {
  return localDateStr(new Date(Date.now() - 86400000));
}

function groupLabel(date: string): string {
  const today = localDateStr();
  if (date === today) return '今天';
  if (date === yday()) return '昨天';
  const [y, m, d] = date.split('-').map(Number);
  const cy = Number(today.slice(0, 4));
  return (y === cy ? '' : y + '年') + m + '月' + d + '日';
}

export default function MemosScreen() {
  const navigation = useNavigation<any>();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const list: any = await api.memos();
      setMemos(list || []);
    } catch (e) {}
    setLoaded(true);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const groups: { date: string; items: Memo[] }[] = [];
  for (const m of memos) {
    const last = groups[groups.length - 1];
    if (last && last.date === m.date) last.items.push(m);
    else groups.push({ date: m.date, items: [m] });
  }

  const openMemo = (m: Memo) => navigation.navigate('MemoEdit', { date: m.date, memoId: m.id, content: m.content });

  const confirmDelete = (m: Memo) => {
    Alert.alert('删除便签', '确定删除这条便签吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        try { await api.deleteMemo(m.id); } catch (e) {}
        load();
      } },
    ]);
  };

  const newMemo = () => navigation.navigate('MemoEdit', { date: localDateStr() });

  return (
    <View style={styles.container}>
      <FlatList
        data={groups}
        keyExtractor={(g) => g.date}
        contentContainerStyle={styles.list}
        ListHeaderComponent={loaded && memos.length === 0 ? <Text style={styles.empty}>还没有便签，点右下角「+」写一条吧</Text> : null}
        renderItem={({ item: g, index }) => (
          <View style={styles.group}>
            <Text style={styles.groupLabel}>{groupLabel(g.date)}</Text>
            {g.items.map((m, i) => (
              <TouchableOpacity key={m.id} style={styles.card} onPress={() => openMemo(m)} onLongPress={() => confirmDelete(m)}>
                <View style={[styles.bar, { backgroundColor: BARS[(index + i) % BARS.length] }]} />
                <Text style={styles.cardText} numberOfLines={3}>{m.content}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={newMemo}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  list: { padding: spacing(4), paddingBottom: spacing(20) },
  group: { marginBottom: spacing(3) },
  groupLabel: { fontSize: 13, fontWeight: '700', color: theme.colors.muted, marginBottom: spacing(2), marginTop: spacing(1) },
  card: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: theme.colors.card, borderRadius: 14, padding: spacing(3), borderWidth: 1, borderColor: theme.colors.border, marginBottom: spacing(2) },
  bar: { width: 4, borderRadius: 2, marginRight: spacing(3) },
  cardText: { flex: 1, fontSize: 15, color: theme.colors.text, lineHeight: 22 },
  empty: { color: theme.colors.muted, fontSize: 14, textAlign: 'center', marginTop: spacing(10) },
  fab: { position: 'absolute', right: spacing(5), bottom: spacing(6), width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  fabText: { color: '#fff', fontSize: 30, fontWeight: '600', lineHeight: 34 },
});
