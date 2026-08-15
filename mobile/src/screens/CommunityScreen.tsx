import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { Post } from '../types';
import { theme, spacing } from '../theme';
import PostCard from '../components/PostCard';

export default function CommunityScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [sort, setSort] = useState<'latest' | 'hot'>('latest');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const list: any = await api.posts(sort); setPosts(list); } catch (e) {}
    setLoading(false);
  }, [sort]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.title}>社区</Text>
        <View style={styles.sortGroup}>
          <TouchableOpacity onPress={() => setSort('latest')}><Text style={[styles.sort, sort === 'latest' && styles.sortActive]}>最新</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setSort('hot')}><Text style={[styles.sort, sort === 'hot' && styles.sortActive]}>热门</Text></TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={posts}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => <PostCard post={item} onPress={() => navigation.navigate('PostDetail', { id: item.id })} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{loading ? '加载中…' : '还没有帖子，来发布第一篇配方吧'}</Text>}
      />
      <TouchableOpacity style={styles.fab} onPress={() => (user ? navigation.navigate('CreatePost') : navigation.navigate('Profile'))}>
        <Text style={styles.fabText}>＋ 发布配方</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, paddingTop: spacing(6) },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing(5) },
  title: { fontSize: 28, fontWeight: '800', color: theme.colors.text },
  sortGroup: { flexDirection: 'row', gap: spacing(3) },
  sort: { fontSize: 15, color: theme.colors.muted, fontWeight: '600' },
  sortActive: { color: theme.colors.primaryDark },
  list: { paddingHorizontal: spacing(5), paddingBottom: spacing(16), gap: spacing(3), marginTop: spacing(3) },
  empty: { color: theme.colors.muted, fontSize: 14, textAlign: 'center', marginTop: spacing(8) },
  fab: { position: 'absolute', bottom: spacing(6), right: spacing(5), backgroundColor: theme.colors.primary, borderRadius: 999, paddingVertical: spacing(3), paddingHorizontal: spacing(5), elevation: 4, shadowColor: theme.colors.shadow, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
