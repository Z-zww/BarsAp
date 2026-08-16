import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { Drink, MoodRecord } from '../types';
import { localDateStr } from '../dates';
import { theme, spacing } from '../theme';
import MoodPicker from '../components/MoodPicker';
import DrinkCard from '../components/DrinkCard';

export default function TodayScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [todayMood, setTodayMood] = useState<MoodRecord | null>(null);
  const [todayMemos, setTodayMemos] = useState<any[]>([]);
  const [moodLoaded, setMoodLoaded] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const promptedRef = useRef(false);
  const [rec, setRec] = useState<Drink[]>([]);
  const [batch, setBatch] = useState(0);
  const [recLoading, setRecLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Drink[] | null>(null);
  const [error, setError] = useState('');

  const loadToday = useCallback(async () => {
    if (!user) { setTodayMood(null); setTodayMemos([]); setMoodLoaded(false); return; }
    try {
      const r: any = await api.moodsToday();
      setTodayMood(r.mood);
      const ms: any = await api.memos(localDateStr());
      setTodayMemos(ms || []);
    } catch (e: any) { setError(e.message || '加载失败'); }
    setMoodLoaded(true);
  }, [user]);

  const loadRec = useCallback(async (mood?: string | null, b = 0) => {
    setRecLoading(true);
    try {
      const list: any = await api.recommend(mood || null, b);
      setRec(list);
    } catch (e: any) { setError(e.message || '加载推荐失败'); }
    setRecLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadToday(); }, [loadToday]));

  useEffect(() => {
    if (moodLoaded && user && !todayMood && !promptedRef.current) {
      promptedRef.current = true;
      setPickerVisible(true);
    }
  }, [moodLoaded, todayMood, user]);

  useEffect(() => {
    if (user) loadRec(todayMood ? todayMood.mood : null, batch);
    else setRec([]);
  }, [todayMood, user, loadRec, batch]);

  const onSelectMood = async (slug: string, note?: string) => {
    setPickerVisible(false);
    try {
      await api.saveMood(localDateStr(), slug, note);
      await loadToday();
    } catch (e: any) { setError(e.message || '保存失败'); }
  };

  const onSkip = () => setPickerVisible(false);

  const doSearch = async () => {
    const q = search.trim();
    if (!q) { setSearchResults(null); return; }
    try {
      const list: any = await api.drinks({ q, limit: 20 });
      setSearchResults(list);
    } catch (e: any) { setError(e.message || '搜索失败'); }
  };

  const today = localDateStr();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.brand}>Drinker</Text>
      <Text style={styles.date}>{today}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!user ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>登录后开始记录每日心情</Text>
          <Text style={styles.cardDesc}>记录心情、同步日历、获取专属酒品推荐</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.primaryBtnText}>去登录 / 注册</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {todayMood ? (
            <View style={styles.moodCard}>
              <Text style={styles.moodEmoji}>{todayMood.emoji}</Text>
              <View style={styles.moodInfo}>
                <Text style={styles.moodLabel}>今天 · {todayMood.label}</Text>
              </View>
              <TouchableOpacity onPress={() => setPickerVisible(true)}><Text style={styles.changeText}>修改</Text></TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.moodCard} onPress={() => setPickerVisible(true)}>
              <Text style={styles.moodEmoji}>🙂</Text>
              <View style={styles.moodInfo}>
                <Text style={styles.moodLabel}>今天还没记录心情</Text>
                <Text style={styles.moodNote}>点此记录，为你推荐一杯合适的酒</Text>
              </View>
            </TouchableOpacity>
          )}

          <Text style={styles.sectionTitle}>为你推荐</Text>
          {recLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: spacing(4) }} />
          ) : rec.length > 0 ? (
            <View>
              <DrinkCard drink={rec[0]} onPress={() => navigation.navigate('DrinkDetail', { id: rec[0].id, drink: rec[0] })} />
              <TouchableOpacity onPress={() => setBatch((b) => b + 1)}>
                <Text style={styles.swap}>换一款 →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.empty}>暂无推荐</Text>
          )}
        </>
      )}

      <Text style={styles.sectionTitle}>搜索酒品</Text>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="输入酒名 / 关键词"
          placeholderTextColor={theme.colors.muted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={doSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={doSearch}><Text style={styles.searchBtnText}>搜索</Text></TouchableOpacity>
      </View>
      {searchResults && searchResults.length === 0 ? <Text style={styles.empty}>没有找到相关酒品</Text> : null}
      {searchResults && searchResults.map((d) => (
        <TouchableOpacity key={d.id} style={styles.searchItem} onPress={() => navigation.navigate('DrinkDetail', { id: d.id })}>
          <Text style={styles.searchName}>{d.name}</Text>
          <Text style={styles.searchSummary} numberOfLines={1}>{d.summary || ''}</Text>
        </TouchableOpacity>
      ))}

      {user ? (
        <TouchableOpacity style={styles.memoCard} onPress={() => todayMemos.length > 0 ? navigation.navigate('Memos') : navigation.navigate('MemoEdit', { date: today })}>
          <View style={styles.memoHeader}>
            <Text style={styles.memoTitle}>今日便签</Text>
            <Text style={styles.memoEdit}>{todayMemos.length > 0 ? todayMemos.length + ' 条 · 查看全部' : '去记录'}</Text>
          </View>
          <Text style={todayMemos.length > 0 ? styles.memoText : styles.memoPlaceholder}>
            {todayMemos.length > 0 ? todayMemos[0].content : '写下今天的心情、灵感或一杯酒的记忆'}
          </Text>
        </TouchableOpacity>
      ) : null}
      <MoodPicker visible={pickerVisible} onSelect={onSelectMood} onSkip={onSkip} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: spacing(5), paddingBottom: spacing(10) },
  brand: { fontSize: 32, fontWeight: '800', color: theme.colors.text },
  date: { fontSize: 14, color: theme.colors.muted, marginTop: 2 },
  error: { color: theme.colors.danger, fontSize: 13, marginTop: spacing(2) },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.radius, padding: spacing(5), borderWidth: 1, borderColor: theme.colors.border, marginTop: spacing(4) },
  cardTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  cardDesc: { fontSize: 14, color: theme.colors.muted, marginTop: spacing(2) },
  primaryBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: spacing(3), alignItems: 'center', marginTop: spacing(4) },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  moodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderRadius: theme.radius, padding: spacing(4), borderWidth: 1, borderColor: theme.colors.border, marginTop: spacing(4) },
  moodEmoji: { fontSize: 44 },
  moodInfo: { flex: 1, marginLeft: spacing(3) },
  moodLabel: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  moodNote: { fontSize: 14, color: theme.colors.muted, marginTop: 2 },
  changeText: { color: theme.colors.primaryDark, fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginTop: spacing(6), marginBottom: spacing(3) },
  swap: { textAlign: 'center', color: theme.colors.primaryDark, fontSize: 15, fontWeight: '600', marginTop: spacing(3) },
  memoCard: { backgroundColor: theme.colors.card, borderRadius: theme.radius, padding: spacing(4), borderWidth: 1, borderColor: theme.colors.border, marginTop: spacing(4) },
  memoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memoTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.primaryDark },
  memoEdit: { fontSize: 13, fontWeight: '700', color: theme.colors.primaryDark },
  memoText: { fontSize: 15, color: theme.colors.text, marginTop: spacing(2), lineHeight: 22 },
  memoPlaceholder: { fontSize: 14, color: theme.colors.muted, marginTop: spacing(2) },
  empty: { color: theme.colors.muted, fontSize: 14, marginTop: spacing(2) },
  searchRow: { flexDirection: 'row', gap: spacing(2) },
  searchInput: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: spacing(3), color: theme.colors.text, fontSize: 15, backgroundColor: theme.colors.card },
  searchBtn: { backgroundColor: theme.colors.text, borderRadius: 12, paddingHorizontal: spacing(4), justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  searchItem: { backgroundColor: theme.colors.card, borderRadius: 12, padding: spacing(3), marginTop: spacing(2), borderWidth: 1, borderColor: theme.colors.border },
  searchName: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  searchSummary: { fontSize: 13, color: theme.colors.muted, marginTop: 2 },
});
