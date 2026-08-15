import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MOODS } from '../moods';
import { theme, spacing } from '../theme';

interface Props {
  visible: boolean;
  onSelect: (slug: string, note?: string) => void;
  onSkip: () => void;
}

export default function MoodPicker({ visible, onSelect, onSkip }: Props) {
  const [note, setNote] = useState('');
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>今天心情如何？</Text>
          <View style={styles.grid}>
            {MOODS.map((m) => (
              <TouchableOpacity
                key={m.slug}
                style={styles.mood}
                onPress={() => { const n = note.trim(); onSelect(m.slug, n || undefined); setNote(''); }}
              >
                <Text style={styles.emoji}>{m.emoji}</Text>
                <Text style={styles.label}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="写句话记录此刻（可选）"
            placeholderTextColor={theme.colors.muted}
            value={note}
            onChangeText={setNote}
          />
          <TouchableOpacity style={styles.skip} onPress={onSkip}>
            <Text style={styles.skipText}>今天不想记录，跳过</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing(6) },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.radius, padding: spacing(5) },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text, textAlign: 'center', marginBottom: spacing(4) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing(3) },
  mood: { alignItems: 'center', width: 64, paddingVertical: spacing(2) },
  emoji: { fontSize: 32 },
  label: { fontSize: 13, color: theme.colors.text, marginTop: spacing(1) },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: spacing(3), marginTop: spacing(4), color: theme.colors.text, fontSize: 15 },
  skip: { marginTop: spacing(3), alignItems: 'center', paddingVertical: spacing(2) },
  skipText: { color: theme.colors.muted, fontSize: 14 },
});
