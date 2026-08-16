import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../api';
import { theme, spacing } from '../theme';

export default function MemoEditScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { date, memoId, content } = route.params || {};
  const [text, setText] = useState(content || '');
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const [createdId, setCreatedId] = useState<number | null>(memoId || null);
  const textRef = useRef(text);
  const savedTextRef = useRef(text);
  const createdIdRef = useRef<number | null>(memoId || null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { textRef.current = text; }, [text]);

  // 编辑模式：若没传 content 则按日期拉取并匹配
  useEffect(() => {
    if (memoId && !content) {
      api.memos(date).then((list: any) => {
        const m = (list || []).find((x: any) => x.id === memoId);
        if (m) { setText(m.content); textRef.current = m.content; savedTextRef.current = m.content; }
      }).catch(() => {});
    }
  }, [memoId, content, date]);

  const persist = async (): Promise<void> => {
    const val = textRef.current.trim();
    if (!val) return;
    setSaving(true); setSaveState('saving'); setError('');
    try {
      if (createdIdRef.current) {
        await api.updateMemo(createdIdRef.current, val);
      } else {
        const r: any = await api.createMemo(date, val);
        createdIdRef.current = r.id;
        setCreatedId(r.id);
      }
      savedTextRef.current = textRef.current;
      setSaveState('saved');
    } catch (e: any) {
      setSaveState('error'); setError(e.message || '保存失败');
    } finally { setSaving(false); }
  };

  // 编辑模式：输入停止 600ms 自动保存；新建模式：离开时保存
  const onChangeText = (value: string) => {
    setText(value); textRef.current = value; setSaveState('idle');
    if (timerRef.current) clearTimeout(timerRef.current);
    if (createdIdRef.current) {
      timerRef.current = setTimeout(() => { persist(); }, 600);
    }
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    // 新建模式下离开且内容非空且未保存 → 落库
    if (!createdIdRef.current && textRef.current.trim() && textRef.current !== savedTextRef.current) {
      api.createMemo(date, textRef.current.trim()).catch(() => {});
    }
  }, [date]);

  const saveAndBack = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!textRef.current.trim()) { navigation.goBack(); return; }
    await persist();
    navigation.goBack();
  };

  const confirmDelete = () => {
    if (!createdIdRef.current) { navigation.goBack(); return; }
    Alert.alert('删除便签', '确定删除这条便签吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        try { await api.deleteMemo(createdIdRef.current!); } catch (e: any) { setError(e.message || '删除失败'); return; }
        navigation.goBack();
      } },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.date}>{date}{createdId ? ' · 编辑' : ' · 新建'}</Text>
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
        {saveState === 'saving' ? '正在保存…' : saveState === 'saved' ? '已自动保存' : saveState === 'error' ? '保存失败，请重试' : (createdId ? '输入内容会自动保存' : '点击下方按钮保存')}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.btnRow}>
        {createdId ? (
          <TouchableOpacity style={[styles.btn, styles.delBtn]} onPress={confirmDelete}>
            <Text style={styles.delText}>删除</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={[styles.btn, styles.saveBtn, saving && { opacity: 0.6 }]} onPress={saveAndBack} disabled={saving}>
          <Text style={styles.saveText}>{saving ? '保存中…' : '保存并返回'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: spacing(5) },
  date: { fontSize: 15, fontWeight: '700', color: theme.colors.muted, marginBottom: spacing(3) },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, padding: spacing(4), color: theme.colors.text, fontSize: 16, minHeight: 220, textAlignVertical: 'top', backgroundColor: theme.colors.card },
  status: { color: theme.colors.muted, fontSize: 13, marginTop: spacing(2) },
  error: { color: theme.colors.danger, fontSize: 14, marginTop: spacing(2) },
  btnRow: { flexDirection: 'row', gap: spacing(2), marginTop: spacing(4) },
  btn: { flex: 1, borderRadius: 14, paddingVertical: spacing(3), alignItems: 'center' },
  delBtn: { flex: 0.4, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border },
  delText: { color: theme.colors.danger, fontSize: 15, fontWeight: '700' },
  saveBtn: { backgroundColor: theme.colors.primary },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
