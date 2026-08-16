import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api';
import { Memo } from '../types';
import { theme, spacing } from '../theme';

interface Props {
  visible: boolean;
  date: string;
  moodEmoji?: string;
  moodLabel?: string;
  onClose: () => void;
  onChangeMood: () => void;
  onSeeAll: () => void;
}

export default function DayDetail({ visible, date, moodEmoji, moodLabel, onClose, onChangeMood, onSeeAll }: Props) {
  const navigation = useNavigation<any>();
  const [memos, setMemos] = useState<Memo[]>([]);

  useEffect(() => {
    if (visible && date) {
      api.memos(date).then((list: any) => setMemos(list || [])).catch(() => setMemos([]));
    }
  }, [visible, date]);

  const addMemo = () => { onClose(); navigation.navigate('MemoEdit', { date }); };
  const editMemo = (m: Memo) => { onClose(); navigation.navigate('MemoEdit', { date, memoId: m.id, content: m.content }); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.dismiss} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.headRow}>
            <Text style={styles.date}>{date}</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.close}>✕</Text></TouchableOpacity>
          </View>

          <View style={styles.moodRow}>
            <Text style={styles.moodEmoji}>{moodEmoji || '🙂'}</Text>
            <Text style={styles.moodLabel}>{moodLabel ? '心情 · ' + moodLabel : '未记录心情'}</Text>
            <TouchableOpacity onPress={onChangeMood}><Text style={styles.changeMood}>修改心情</Text></TouchableOpacity>
          </View>

          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>当日便签</Text>
            <Text style={styles.count}>{memos.length} 条</Text>
          </View>

          <ScrollView style={styles.memoList} contentContainerStyle={memos.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : undefined}>
            {memos.length === 0 ? (
              <Text style={styles.empty}>这一天还没有便签</Text>
            ) : memos.map((m) => (
              <TouchableOpacity key={m.id} style={styles.memoItem} onPress={() => editMemo(m)}>
                <View style={styles.bullet} />
                <Text style={styles.memoText} numberOfLines={2}>{m.content}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.addBtn} onPress={addMemo}>
            <Text style={styles.addText}>＋ 添加便签</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.seeAll} onPress={onSeeAll}>
            <Text style={styles.seeAllText}>查看全部便签 →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  dismiss: { flex: 1 },
  sheet: { backgroundColor: theme.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: spacing(5), paddingBottom: spacing(8), maxHeight: '75%' },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: theme.colors.border, marginTop: spacing(2) },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing(2) },
  date: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  close: { fontSize: 18, color: theme.colors.muted, padding: spacing(1) },
  moodRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing(3), backgroundColor: theme.colors.bg, borderRadius: 14, padding: spacing(3) },
  moodEmoji: { fontSize: 30 },
  moodLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.colors.text, marginLeft: spacing(2) },
  changeMood: { fontSize: 14, fontWeight: '700', color: theme.colors.primaryDark },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing(4) },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  count: { fontSize: 13, color: theme.colors.muted },
  memoList: { marginTop: spacing(2), maxHeight: 260 },
  empty: { color: theme.colors.muted, fontSize: 14, textAlign: 'center', paddingVertical: spacing(4) },
  memoItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing(2), borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary, marginRight: spacing(3) },
  memoText: { flex: 1, fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  addBtn: { backgroundColor: theme.colors.primary, borderRadius: 14, paddingVertical: spacing(3), alignItems: 'center', marginTop: spacing(4) },
  addText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  seeAll: { alignItems: 'center', marginTop: spacing(2) },
  seeAllText: { color: theme.colors.primaryDark, fontSize: 14, fontWeight: '700' },
});
