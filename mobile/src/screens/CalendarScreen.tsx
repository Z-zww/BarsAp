import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { MoodRecord } from '../types';
import { localDateStr, monthStr } from '../dates';
import { theme, spacing } from '../theme';
import MoodPicker from '../components/MoodPicker';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function pad2(n: number) { return String(n).padStart(2, '0'); }

export default function CalendarScreen() {
  const { user } = useAuth();
  const [cursor, setCursor] = useState(new Date());
  const [moodMap, setMoodMap] = useState<Record<string, MoodRecord>>({});
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerDate, setPickerDate] = useState(localDateStr());
  const [selected, setSelected] = useState<{ date: string; record: MoodRecord | null } | null>(null);

  const load = useCallback(async () => {
    if (!user) { setMoodMap({}); return; }
    try {
      const list: any = await api.moods(monthStr(cursor));
      const map: Record<string, MoodRecord> = {};
      for (const m of list) map[m.date] = m;
      setMoodMap(map);
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

  const onPressDay = (day: number) => {
    const date = year + '-' + pad2(month + 1) + '-' + pad2(day);
    if (date === today) { setPickerDate(date); setPickerVisible(true); }
    else setSelected({ date, record: moodMap[date] || null });
  };

  const onSelectMood = async (slug: string, note?: string) => {
    setPickerVisible(false);
    try { await api.saveMood(pickerDate, slug, note); await load(); } catch (e) {}
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>心情日历</Text>
      {!user ? (
        <Text style={styles.hint}>登录后可同步每日心情到日历</Text>
      ) : (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => move(-1)}><Text style={styles.nav}>‹</Text></TouchableOpacity>
            <Text style={styles.monthLabel}>{year} 年 {month + 1} 月</Text>
            <TouchableOpacity onPress={() => move(1)}><Text style={styles.nav}>›</Text></TouchableOpacity>
          </View>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w) => <Text key={w} style={styles.weekday}>{w}</Text>)}
          </View>
          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (day === null) return <View key={'e' + i} style={styles.cell} />;
              const date = year + '-' + pad2(month + 1) + '-' + pad2(day);
              const rec = moodMap[date];
              const isToday = date === today;
              return (
                <TouchableOpacity key={day} style={[styles.cell, isToday && styles.todayCell]} onPress={() => onPressDay(day)}>
                  <Text style={[styles.dayNum, isToday && styles.todayText]}>{day}</Text>
                  {rec ? <Text style={styles.dayEmoji}>{rec.emoji}</Text> : null}
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={styles.recordBtn} onPress={() => { setPickerDate(today); setPickerVisible(true); }}>
            <Text style={styles.recordBtnText}>记录 / 修改今天的心情</Text>
          </TouchableOpacity>
          {selected ? (
            <View style={styles.selectedCard}>
              <Text style={styles.selectedDate}>{selected.date}</Text>
              {selected.record ? (
                <Text style={styles.selectedMood}>{selected.record.emoji} {selected.record.label}</Text>
              ) : (
                <Text style={styles.selectedMood}>这一天没有记录</Text>
              )}
              {selected.record && selected.record.note ? <Text style={styles.selectedNote}>{selected.record.note}</Text> : null}
            </View>
          ) : null}
        </>
      )}
      <MoodPicker visible={pickerVisible} onSelect={onSelectMood} onSkip={() => setPickerVisible(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: spacing(5), paddingBottom: spacing(10) },
  title: { fontSize: 28, fontWeight: '800', color: theme.colors.text },
  hint: { color: theme.colors.muted, fontSize: 14, marginTop: spacing(4) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing(5) },
  nav: { fontSize: 28, color: theme.colors.primaryDark, paddingHorizontal: spacing(3) },
  monthLabel: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  weekRow: { flexDirection: 'row', marginTop: spacing(4) },
  weekday: { flex: 1, textAlign: 'center', color: theme.colors.muted, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing(2) },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  todayCell: { backgroundColor: theme.colors.primary, borderRadius: 999 },
  dayNum: { fontSize: 15, color: theme.colors.text },
  todayText: { color: '#fff', fontWeight: '700' },
  dayEmoji: { fontSize: 16, marginTop: 1 },
  recordBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: spacing(3), alignItems: 'center', marginTop: spacing(5) },
  recordBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  selectedCard: { backgroundColor: theme.colors.card, borderRadius: theme.radius, padding: spacing(4), borderWidth: 1, borderColor: theme.colors.border, marginTop: spacing(4) },
  selectedDate: { fontSize: 13, color: theme.colors.muted },
  selectedMood: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginTop: spacing(1) },
  selectedNote: { fontSize: 14, color: theme.colors.muted, marginTop: spacing(2) },
});
