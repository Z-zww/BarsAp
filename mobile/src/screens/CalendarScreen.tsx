import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { MoodRecord } from '../types';
import { localDateStr, monthStr } from '../dates';
import { theme, spacing } from '../theme';
import { MOOD_MAP } from '../moods';
import DayEditor from '../components/DayEditor';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const ACCENTS = ['#E07A5F', '#C2410C', '#0E7490', '#7C3AED', '#15803D', '#BE185D'];
const ACCENT_KEY = 'drinker_accent';

function pad2(n: number) { return String(n).padStart(2, '0'); }

export default function CalendarScreen() {
  const { user } = useAuth();
  const [cursor, setCursor] = useState(new Date());
  const [moodMap, setMoodMap] = useState<Record<string, MoodRecord>>({});
  const [editing, setEditing] = useState<{ date: string; record: MoodRecord | null } | null>(null);
  const [accent, setAccent] = useState(theme.colors.primary);
  const [recipeDays, setRecipeDays] = useState<Record<string, boolean>>({});

  useEffect(() => {
    AsyncStorage.getItem(ACCENT_KEY).then((v) => { if (v) setAccent(v); });
  }, []);

  const pickAccent = (c: string) => { setAccent(c); AsyncStorage.setItem(ACCENT_KEY, c); };

  const load = useCallback(async () => {
    if (!user) { setMoodMap({}); setRecipeDays({}); return; }
    try {
      const list: any = await api.moods(monthStr(cursor));
      const map: Record<string, MoodRecord> = {};
      for (const m of list) map[m.date] = m;
      setMoodMap(map);
      const posts: any = await api.myPosts();
      const rd: Record<string, boolean> = {};
      for (const p of (posts || [])) {
        const d = (p.created_at || '').slice(0, 10);
        if (d) rd[d] = true;
      }
      setRecipeDays(rd);
    } catch (e) {}
  }, [user, cursor]);

  useEffect(() => { load(); }, [load]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = localDateStr();
  const move = (delta: number) => setCursor(new Date(year, month + delta, 1));

  const openDay = (day: number) => {
    const date = year + '-' + pad2(month + 1) + '-' + pad2(day);
    setEditing({ date, record: moodMap[date] || null });
  };

  const onSaveDay = async (mood: string | null, note: string | null) => {
    if (!editing) return;
    const date = editing.date;
    setEditing(null);
    try { await api.saveMood(date, mood, note); await load(); } catch (e) {}
  };

  const moodCounts: Record<string, number> = {};
  for (const r of Object.values(moodMap)) if (r.mood) moodCounts[r.mood] = (moodCounts[r.mood] || 0) + 1;
  const summary = Object.entries(moodCounts);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headRow}>
        <Text style={styles.title}>心情日历</Text>
        <View style={styles.accentRow}>
          {ACCENTS.map((c) => (
            <TouchableOpacity key={c} onPress={() => pickAccent(c)} style={[styles.accentDot, { backgroundColor: c }, accent === c && styles.accentDotActive]} />
          ))}
        </View>
      </View>
      {!user ? (
        <Text style={styles.hint}>登录后可同步每日心情到日历</Text>
      ) : (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => move(-1)} style={styles.navBtn}><Text style={styles.nav}>‹</Text></TouchableOpacity>
            <Text style={styles.monthLabel}>{year} 年 {month + 1} 月</Text>
            <TouchableOpacity onPress={() => move(1)} style={styles.navBtn}><Text style={styles.nav}>›</Text></TouchableOpacity>
          </View>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => <Text key={w} style={[styles.weekday, (i === 0 || i === 6) && styles.weekend]}>{w}</Text>)}
          </View>
          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (day === null) return <View key={'e' + i} style={styles.cell} />;
              const date = year + '-' + pad2(month + 1) + '-' + pad2(day);
              const rec = moodMap[date];
              const isToday = date === today;
              const wd = new Date(year, month, day).getDay();
              const hasMood = !!(rec && rec.mood);
              const hasNote = !!(rec && rec.note);
              return (
                <TouchableOpacity key={day} style={styles.cell} onPress={() => openDay(day)}>
                  <View style={[styles.dayInner, isToday && { backgroundColor: accent }]}>
                    <Text style={[styles.dayNum, isToday && styles.todayText, (wd === 0 || wd === 6) && !isToday && styles.weekend]}>{day}</Text>
                    {hasMood ? <Text style={styles.dayEmoji}>{rec!.emoji}</Text> : hasNote ? <Text style={styles.dayEmoji}>📝</Text> : <Text style={styles.dayEmpty}> </Text>}
                    {hasMood && hasNote ? <View style={[styles.noteDot, { backgroundColor: isToday ? '#fff' : accent }]} /> : null}
                    {recipeDays[date] ? <Text style={styles.recipeDot}>🍹</Text> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={[styles.recordBtn, { backgroundColor: accent }]} onPress={() => openDay(Number(today.slice(-2)))}>
            <Text style={styles.recordBtnText}>记录 / 修改今天的心情</Text>
          </TouchableOpacity>
          <Text style={styles.tip}>💡 点任意日期可补填当天心情、写便签</Text>

          {summary.length > 0 ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>本月心情</Text>
              <View style={styles.summaryRow}>
                {summary.map(([slug, count]) => {
                  const m = MOOD_MAP[slug];
                  return <View key={slug} style={styles.summaryChip}><Text style={styles.summaryEmoji}>{m ? m.emoji : slug}</Text><Text style={styles.summaryCount}>×{count}</Text></View>;
                })}
              </View>
            </View>
          ) : null}
        </>
      )}
      <DayEditor
        visible={!!editing}
        date={editing ? editing.date : ''}
        initialMood={editing && editing.record ? editing.record.mood : null}
        initialNote={editing && editing.record ? editing.record.note : null}
        onSave={onSaveDay}
        onClose={() => setEditing(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: spacing(5), paddingBottom: spacing(10) },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: theme.colors.text },
  accentRow: { flexDirection: 'row', gap: spacing(2) },
  accentDot: { width: 22, height: 22, borderRadius: 11 },
  accentDotActive: { borderWidth: 2, borderColor: theme.colors.text },
  hint: { color: theme.colors.muted, fontSize: 14, marginTop: spacing(4) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing(5) },
  navBtn: { paddingHorizontal: spacing(3), paddingVertical: spacing(1) },
  nav: { fontSize: 28, color: theme.colors.primaryDark, fontWeight: '700' },
  monthLabel: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  weekRow: { flexDirection: 'row', marginTop: spacing(4), paddingBottom: spacing(1) },
  weekday: { flex: 1, textAlign: 'center', color: theme.colors.muted, fontSize: 13, fontWeight: '600' },
  weekend: { color: theme.colors.primaryDark },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing(1) },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  dayInner: { width: '88%', aspectRatio: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontSize: 15, color: theme.colors.text },
  todayText: { color: '#fff', fontWeight: '800' },
  dayEmoji: { fontSize: 15, marginTop: 1 },
  dayEmpty: { fontSize: 15, opacity: 0 },
  noteDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  recipeDot: { fontSize: 9, lineHeight: 11 },
  recordBtn: { borderRadius: 12, paddingVertical: spacing(3), alignItems: 'center', marginTop: spacing(5) },
  recordBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  tip: { fontSize: 12, color: theme.colors.muted, textAlign: 'center', marginTop: spacing(2) },
  summaryCard: { backgroundColor: theme.colors.card, borderRadius: theme.radius, padding: spacing(4), borderWidth: 1, borderColor: theme.colors.border, marginTop: spacing(4) },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: spacing(2) },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) },
  summaryChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.bg, borderRadius: 999, paddingHorizontal: spacing(2), paddingVertical: 4 },
  summaryEmoji: { fontSize: 16 },
  summaryCount: { fontSize: 13, color: theme.colors.muted, fontWeight: '600' },
});
