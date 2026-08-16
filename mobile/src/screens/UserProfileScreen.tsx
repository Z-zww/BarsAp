import React, { useCallback, useState } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { api, resolveImg } from '../api';
import { useAuth } from '../AuthContext';
import { useRealtime } from '../RealtimeContext';
import { Post } from '../types';
import PostCard from '../components/PostCard';
import { theme, spacing } from '../theme';

export default function UserProfileScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user: me } = useAuth();
  const { onlineUsers } = useRealtime();
  const userId = Number(route.params.userId);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [p, list]: any = await Promise.all([api.userProfile(userId), api.userPosts(userId)]);
    setProfile(p); setPosts(list || []);
  }, [userId]);
  useFocusEffect(useCallback(() => { load().catch(() => {}); }, [load]));

  const toggleFollow = async () => {
    setBusy(true);
    try { await api.toggleFollow(userId); await load(); } finally { setBusy(false); }
  };

  if (!profile) return <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>;
  const u = profile.user;
  const online = onlineUsers.has(userId) || profile.online;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={posts}
      keyExtractor={(post) => String(post.id)}
      renderItem={({ item }) => <PostCard post={item} onPress={() => navigation.navigate('PostDetail', { id: item.id })} />}
      ItemSeparatorComponent={() => <View style={{ height: spacing(3) }} />}
      ListHeaderComponent={(
        <View>
          <View style={styles.profile}>
            {u.avatar ? <Image source={{ uri: resolveImg(u.avatar) || undefined }} style={styles.avatar} /> : <Text style={styles.avatarFallback}>🍹</Text>}
            <View style={styles.nameRow}><Text style={styles.name}>@{u.username}</Text><View style={[styles.dot, online && styles.dotOnline]} /></View>
            <Text style={styles.presence}>{online ? '在线' : '离线'}</Text>
            <View style={styles.stats}>
              <Text style={styles.stat}>{profile.followers_count} 粉丝</Text>
              <Text style={styles.stat}>{profile.following_count} 关注</Text>
              <Text style={styles.stat}>{profile.posts_count} 配方</Text>
            </View>
            {me && me.id !== userId ? (
              <View style={styles.actions}>
                <TouchableOpacity style={[styles.actionBtn, profile.followed_by_me && styles.actionGhost]} onPress={toggleFollow} disabled={busy}>
                  <Text style={profile.followed_by_me ? styles.actionGhostText : styles.actionText}>{profile.followed_by_me ? '已关注' : '关注'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.actionGhost]} onPress={() => navigation.navigate('Chat', { userId, username: u.username })}>
                  <Text style={styles.actionGhostText}>私信</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
          <Text style={styles.section}>发布的配方</Text>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.empty}>还没有发布配方</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: spacing(5), paddingBottom: spacing(10) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg },
  profile: { alignItems: 'center' },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: { fontSize: 58 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginTop: spacing(3) },
  name: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: theme.colors.muted },
  dotOnline: { backgroundColor: '#22C55E' },
  presence: { fontSize: 13, color: theme.colors.muted, marginTop: 2 },
  stats: { flexDirection: 'row', gap: spacing(5), marginTop: spacing(3) },
  stat: { fontSize: 14, color: theme.colors.text, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: spacing(2), marginTop: spacing(4), alignSelf: 'stretch' },
  actionBtn: { flex: 1, alignItems: 'center', backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: spacing(3) },
  actionText: { color: '#fff', fontWeight: '700' },
  actionGhost: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  actionGhostText: { color: theme.colors.primaryDark, fontWeight: '700' },
  section: { fontSize: 17, fontWeight: '700', color: theme.colors.text, marginTop: spacing(6), marginBottom: spacing(3) },
  empty: { textAlign: 'center', color: theme.colors.muted, marginTop: spacing(5) },
});
