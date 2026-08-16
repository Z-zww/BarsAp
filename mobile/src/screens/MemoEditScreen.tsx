import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../api';
import { theme, spacing } from '../theme';

export default function MemoEditScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { date, mood, note } = route.params || {};
  const [text, setText] = useState(note || '');
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const textRef = useRef(text);
  const savedTextRef = useRef(text);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { textRef.current = text; }, [text]);
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (textRef.current !== savedTextRef.current) {
      api.saveMood(date, mood || null, textRef.current.trim() || null).catch(() => {});
    }
  }, [date, mood]);

  const saveDraft = async (closeAfterSave = false) => {
    setSaving(true); setSaveState('saving'); setError('');
    try {
      await api.saveMood(date, mood || null, textRef.current.trim() || null);
      savedTextRef.current = textRef.current;
      setSaveState('saved');
      if (closeAfterSave) navigation.goBack();
    } catch (e: any) {
      setSaveState('error'); setError(e.message || '保存失败');
    } finally { setSaving(false); }
  };

  const onChangeText = (value: string) => {
    setText(value); textRef.current = value; setSaveState('idle');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { saveDraft(false); }, 600);
  };

  const save = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await saveDraft(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.date}>{date} 的便签</Text>
      <TextInput
        style={styles.input}
        placeholder="写点什么…"
        placeholderTextColor={theme.colors.muted}
        value={text}
        onChangeText={onChangeText}
        multiline
        autoFocus
      />
      <Text style={styles.status}>
        {saveState === 'saving' ? '正在保存…' : saveState === 'saved' ? '已自动保存' : saveState === 'error' ? '保存失败，请重试' : '输入内容会自动保存'}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
        <Text style={styles.saveText}>{saving ? '保存中…' : '保存并返回'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: spacing(5) },
  date: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: spacing(3) },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: spacing(3), color: theme.colors.text, fontSize: 15, minHeight: 220, textAlignVertical: 'top', backgroundColor: theme.colors.card },
  status: { color: theme.colors.muted, fontSize: 13, marginTop: spacing(2) },
  error: { color: theme.colors.danger, fontSize: 14, marginTop: spacing(2) },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: spacing(3), alignItems: 'center', marginTop: spacing(4) },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
