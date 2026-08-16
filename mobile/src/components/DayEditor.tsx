import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MOODS } from '../moods';
import { theme, spacing } from '../theme';

interface Props {
  visible: boolean;
  date: string;
  initialMood: string | null;
  onSave: (mood: string | null) => void;
  onClose: () => void;
}

export default function DayEditor({ visible, date, initialMood, onSave, onClose }: Props) {
  const [mood, setMood] = useState<string | null>(null);

  useEffect(() => {
    if (visible) setMood(initialMood || null);
  }, [visible, date, initialMood]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{date}</Text>
          <Text style={styles.sub}>选择今天的心情</Text>
          <View style={styles.grid}>
            {MOODS.map((m) => (
              <TouchableOpacity key={m.slug} style={[styles.mood, mood === m.slug && styles.moodActive]} onPress={() => setMood(mood === m.slug ? null : m.slug)}>
                <Text style={styles.emoji}>{m.emoji}</Text>
                <Text style={styles.label}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {mood ? <TouchableOpacity onPress={() => setMood(null)}><Text style={styles.clear}>✕ 清除心情</Text></TouchableOpacity> : null}
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={onClose}><Text style={styles.cancelText}>取消</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.save]} onPress={() => onSave(mood)}><Text style={styles.saveText}>保存心情</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing(5) },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.radius, padding: spacing(5) },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text, textAlign: 'center' },
  sub: { fontSize: 13, color: theme.colors.muted, marginTop: spacing(2) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing(2), marginTop: spacing(3) },
  mood: { alignItems: 'center', width: 60, paddingVertical: spacing(2), borderRadius: 12 },
  moodActive: { backgroundColor: '#F6E9E1' },
  emoji: { fontSize: 28 },
  label: { fontSize: 12, color: theme.colors.text, marginTop: 2 },
  clear: { color: theme.colors.primaryDark, fontSize: 14, textAlign: 'center', marginTop: spacing(2), fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: spacing(2), marginTop: spacing(4) },
  btn: { flex: 1, borderRadius: 12, paddingVertical: spacing(3), alignItems: 'center' },
  cancel: { backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border },
  cancelText: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  save: { backgroundColor: theme.colors.primary },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
