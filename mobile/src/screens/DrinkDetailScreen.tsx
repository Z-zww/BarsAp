import React, { useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Linking, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api, resolveImg } from '../api';
import { Drink } from '../types';
import { MOOD_MAP } from '../moods';
import { theme, spacing } from '../theme';
import { useAuth } from '../AuthContext';

export default function DrinkDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const [drink, setDrink] = useState<Drink | null>(null);
  const [error, setError] = useState('');
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    if (route.params.drink) { setDrink(route.params.drink); return; }
    (async () => {
      try { const d: any = await api.drink(route.params.id); setDrink(d); }
      catch (e: any) { setError(e.message || '加载失败'); }
    })();
  }, [route.params.id, route.params.drink]);

  useLayoutEffect(() => { if (drink) navigation.setOptions({ title: drink.name }); }, [drink, navigation]);

  useEffect(() => {
    if (!user || !drink) { setFavorited(false); return; }
    api.favorites().then((list: any) => setFavorited((list || []).some((d: any) => d.id === drink.id))).catch(() => {});
  }, [user, drink]);

  const toggleFav = async () => {
    if (!user || !drink) return;
    try {
      const r: any = await api.toggleFavorite(drink);
      setFavorited(r.favorited);
    } catch (e) {}
  };

  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;
  if (!drink) return <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>;

  const img = resolveImg(drink.image);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {img ? (
        <Image source={{ uri: img }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]}><Text style={styles.placeholderText}>🍹</Text></View>
      )}
      <Text style={styles.name}>{drink.name}</Text>
      {drink.nameEn ? <Text style={styles.nameEn}>{drink.nameEn}</Text> : null}
      {drink.category ? <Text style={styles.category}>{drink.category}</Text> : null}
      {drink.moods.length > 0 ? (
        <View style={styles.moods}>
          {drink.moods.map((m) => (MOOD_MAP[m] ? <Text key={m} style={styles.moodTag}>{MOOD_MAP[m].emoji} {MOOD_MAP[m].label}</Text> : null))}
        </View>
      ) : null}
      {drink.summary ? <Text style={styles.summary}>{drink.summary}</Text> : null}

      {user ? (
        <TouchableOpacity style={[styles.favBtn, favorited && styles.favBtnActive]} onPress={toggleFav}>
          <Text style={styles.favText}>{favorited ? '❤️ 已收藏到我的酒库' : '🤍 收藏到我的酒库'}</Text>
        </TouchableOpacity>
      ) : null}

      {drink.history ? (
        <>
          <Text style={styles.section}>历史渊源</Text>
          <Text style={styles.para}>{drink.history}</Text>
        </>
      ) : null}

      {drink.ingredients.length > 0 ? (
        <>
          <Text style={styles.section}>配方</Text>
          {drink.ingredients.map((ing, i) => (
            <Text key={i} style={styles.item}>· {ing.name}{ing.amount ? '　' + ing.amount : ''}</Text>
          ))}
        </>
      ) : null}

      {drink.steps.length > 0 ? (
        <>
          <Text style={styles.section}>做法</Text>
          {drink.steps.map((s, i) => (
            <Text key={i} style={styles.step}><Text style={styles.stepNum}>{i + 1}. </Text>{s}</Text>
          ))}
        </>
      ) : null}

      {drink.videos.length > 0 ? (
        <>
          <Text style={styles.section}>视频教程</Text>
          {drink.videos.map((v, i) => (
            <TouchableOpacity key={i} onPress={() => Linking.openURL(v.url)}>
              <Text style={styles.video}>🎬 {v.title}</Text>
            </TouchableOpacity>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: spacing(5), paddingBottom: spacing(10) },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.bg },
  error: { color: theme.colors.danger, fontSize: 14 },
  image: { width: '100%', height: 240, borderRadius: theme.radius },
  placeholder: { backgroundColor: '#F3EDE4', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 64 },
  name: { fontSize: 26, fontWeight: '800', color: theme.colors.text, marginTop: spacing(4) },
  nameEn: { fontSize: 15, color: theme.colors.muted, marginTop: 2 },
  category: { fontSize: 13, color: theme.colors.primaryDark, marginTop: spacing(2), fontWeight: '600' },
  moods: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1), marginTop: spacing(3) },
  moodTag: { fontSize: 13, color: theme.colors.primaryDark, backgroundColor: '#F6E9E1', paddingHorizontal: spacing(2), paddingVertical: 3, borderRadius: 999 },
  summary: { fontSize: 15, color: theme.colors.text, marginTop: spacing(3), lineHeight: 22 },
  favBtn: { marginTop: spacing(4), borderRadius: 12, paddingVertical: spacing(3), alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card },
  favBtnActive: { borderColor: theme.colors.like, backgroundColor: '#FBE9E9' },
  favText: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  section: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginTop: spacing(6), marginBottom: spacing(2) },
  para: { fontSize: 15, color: theme.colors.text, lineHeight: 24 },
  item: { fontSize: 15, color: theme.colors.text, lineHeight: 26 },
  step: { fontSize: 15, color: theme.colors.text, lineHeight: 26 },
  stepNum: { fontWeight: '700', color: theme.colors.primaryDark },
  video: { fontSize: 15, color: theme.colors.primaryDark, textDecorationLine: 'underline', lineHeight: 28 },
});
