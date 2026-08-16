import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { api, uploadImage, resolveImg } from '../api';
import { encryptText, encryptList } from '../crypto';
import { theme, spacing } from '../theme';

export default function CreatePostScreen() {
  const navigation = useNavigation<any>();
  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [steps, setSteps] = useState<string[]>(['']);
  const [image, setImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const setLine = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, i: number, val: string) => {
    const next = list.slice();
    next[i] = val;
    setList(next);
  };
  const addLine = (setList: React.Dispatch<React.SetStateAction<string[]>>) => setList((l) => [...l, '']);
  const removeLine = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, i: number) => setList(list.filter((_, idx) => idx !== i));

  const doUpload = async (uri: string) => {
    setUploading(true);
    setError('');
    try {
      const r = await uploadImage(uri);
      setImage(r.url);
    } catch (e: any) { setError(e.message || '图片上传失败'); }
    setUploading(false);
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setError('需要相册权限才能选择图片'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled && result.assets && result.assets[0]) await doUpload(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { setError('需要相机权限才能拍照'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets && result.assets[0]) await doUpload(result.assets[0].uri);
  };

  const submit = async () => {
    const ings = ingredients.map((s) => s.trim()).filter(Boolean);
    const stps = steps.map((s) => s.trim()).filter(Boolean);
    if (!title.trim()) { setError('请填写标题'); return; }
    if (stps.length === 0) { setError('至少写一个步骤'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.createPost({ title: encryptText(title.trim()), ingredients: encryptList(ings), steps: encryptList(stps), image: image || undefined });
      navigation.goBack();
    } catch (e: any) { setError(e.message || '发布失败'); }
    setSubmitting(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>标题</Text>
      <TextInput style={styles.input} placeholder="例如：我的薄荷金汤力" placeholderTextColor={theme.colors.muted} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>配料</Text>
      {ingredients.map((v, i) => (
        <View key={'i' + i} style={styles.lineRow}>
          <TextInput style={[styles.input, styles.lineInput]} placeholder="例如：金酒 45ml" placeholderTextColor={theme.colors.muted} value={v} onChangeText={(t) => setLine(ingredients, setIngredients, i, t)} />
          {ingredients.length > 1 ? <TouchableOpacity onPress={() => removeLine(ingredients, setIngredients, i)}><Text style={styles.remove}>✕</Text></TouchableOpacity> : null}
        </View>
      ))}
      <TouchableOpacity onPress={() => addLine(setIngredients)}><Text style={styles.add}>＋ 添加配料</Text></TouchableOpacity>

      <Text style={styles.label}>步骤</Text>
      {steps.map((v, i) => (
        <View key={'s' + i} style={styles.lineRow}>
          <TextInput style={[styles.input, styles.lineInput]} placeholder={'步骤 ' + (i + 1)} placeholderTextColor={theme.colors.muted} value={v} onChangeText={(t) => setLine(steps, setSteps, i, t)} multiline />
          {steps.length > 1 ? <TouchableOpacity onPress={() => removeLine(steps, setSteps, i)}><Text style={styles.remove}>✕</Text></TouchableOpacity> : null}
        </View>
      ))}
      <TouchableOpacity onPress={() => addLine(setSteps)}><Text style={styles.add}>＋ 添加步骤</Text></TouchableOpacity>

      <Text style={styles.label}>成品图（可选）</Text>
      {image ? <Image source={{ uri: resolveImg(image) || undefined }} style={styles.preview} /> : null}
      <View style={styles.imgRow}>
        <TouchableOpacity style={styles.imgBtn} onPress={pickFromLibrary}><Text style={styles.imgBtnText}>🖼️ 从相册选择</Text></TouchableOpacity>
        <TouchableOpacity style={styles.imgBtn} onPress={takePhoto}><Text style={styles.imgBtnText}>📷 拍照</Text></TouchableOpacity>
      </View>
      {uploading ? <ActivityIndicator color={theme.colors.primary} style={{ marginTop: spacing(2) }} /> : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting}>
        <Text style={styles.submitText}>{submitting ? '发布中…' : '发布到社区'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: spacing(5), paddingBottom: spacing(12) },
  label: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginTop: spacing(4), marginBottom: spacing(2) },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: spacing(3), color: theme.colors.text, fontSize: 15, backgroundColor: theme.colors.card },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginBottom: spacing(2) },
  lineInput: { flex: 1 },
  remove: { color: theme.colors.danger, fontSize: 18, paddingHorizontal: spacing(1) },
  add: { color: theme.colors.primaryDark, fontSize: 14, fontWeight: '600', marginTop: spacing(1) },
  preview: { width: '100%', height: 180, borderRadius: theme.radius, marginTop: spacing(2) },
  imgRow: { flexDirection: 'row', gap: spacing(2), marginTop: spacing(2) },
  imgBtn: { flex: 1, borderRadius: 12, paddingVertical: spacing(3), alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card },
  imgBtnText: { color: theme.colors.primaryDark, fontSize: 14, fontWeight: '700' },
  error: { color: theme.colors.danger, fontSize: 14, marginTop: spacing(3) },
  submitBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: spacing(4), alignItems: 'center', marginTop: spacing(6) },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
