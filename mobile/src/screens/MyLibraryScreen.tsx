import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { Drink, Post } from '../types';
import { theme, spacing } from '../theme';
import DrinkCard from '../components/DrinkCard';
import PostCard from '../components/PostCard';

export default function MyLibraryScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [favs, setFavs] = useState<Drink[]>([]);
  const [mine, setMine] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setFavs([]); setMine([]); return; }
    setLoading(true);
    try {
      const [f, m]: any = await Promise.all([api.favorites(), api.myPosts()]);
      setFavs(f || []);
      setMine(m || []);
    } catch (e) {}
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const data: any[] = [];
  if (favs.length > 0) { data.push({ k: 'h', t: '我的收藏' }); favs.forEach((d) => data.push({ k: 'd', d })); }
  if (mine.length > 0) { data.push({ k: 'h', t: '我的配方' }); mine.forEach((p) => data.push({ k: 'p', p })); }

  if (!user) return <View style={styles.center}><Text style={styles.empty}>登录后可查看个人酒库</Text></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(it, i) => String(i)}
        renderItem={({ item }) => {
          if (item.k === 'h') return <Text style={styles.section}>{item.t}</Text>;
          if (item.k === 'd') return <DrinkCard drink={item.d} onPress={() => navigation.navigate('DrinkDetail', { id: item.d.id, drink: item.d })} />;
          return <PostCard post={item.p} onPress={() => navigation.navigate('PostDetail', { id: item.p.id })} />;
        }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{loading ? '加载中…' : '还没有收藏或配方，去酒库收藏、去社区发布配方吧'}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, paddingTop: spacing(4) },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.bg },
  section: { fontSize: 15, fontWeight: '700', color: theme.colors.primaryDark, marginTop: spacing(3), paddingHorizontal: spacing(5) },
  list: { paddingHorizontal: spacing(5), paddingBottom: spacing(10), gap: spacing(3) },
  empty: { color: theme.colors.muted, fontSize: 14, textAlign: 'center', marginTop: spacing(8), paddingHorizontal: spacing(5) },
});
