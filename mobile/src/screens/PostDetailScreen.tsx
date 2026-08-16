import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../AuthContext';
import { api, resolveImg } from '../api';
import { encryptText } from '../crypto';
import { Post, CommentItem } from '../types';
import { theme, spacing } from '../theme';
import { useRealtime } from '../RealtimeContext';

function formatTime(s: string) { return s ? s.replace('T', ' ').slice(0, 16) : ''; }

export default function PostDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { event } = useRealtime();
  const [data, setData] = useState<{ post: Post; comments: CommentItem[] } | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const r: any = await api.post(route.params.id); setData(r); }
    catch (e: any) { setError(e.message || '加载失败'); }
  }, [route.params.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (event?.type === 'community' && Number(event.postId) === Number(route.params.id)) load(); }, [event?.eventId, load, route.params.id]);

  const toggleLike = async () => {
    if (!user) return;
    setBusy(true);
    try { await api.like(route.params.id); await load(); } catch (e) {}
    setBusy(false);
  };

  const submitComment = async () => {
    if (!user || !comment.trim()) return;
    setBusy(true);
    try { await api.comment(route.params.id, encryptText(comment.trim())); setComment(''); await load(); } catch (e) {}
    setBusy(false);
  };

  const confirmDelete = () => {
    Alert.alert('删除配方', '确定删除这个配方吗？删除后不可恢复。', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        try { await api.deletePost(route.params.id); } catch (e: any) { setError(e.message || '删除失败'); return; }
        navigation.goBack();
      } },
    ]);
  };

  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;
  if (!data) return <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>;

  const { post, comments } = data;
  const postImg = resolveImg(post.image);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{post.title}</Text>
      <TouchableOpacity style={styles.authorRow} onPress={() => navigation.navigate('UserProfile', { userId: post.author_id })}>
        {post.author_avatar ? <Image source={{ uri: resolveImg(post.author_avatar) || undefined }} style={styles.avatarSmall} /> : null}
        <Text style={styles.meta}>@{post.author} · {formatTime(post.created_at)}</Text>
      </TouchableOpacity>
      {postImg ? <Image source={{ uri: postImg }} style={styles.image} /> : null}
      {post.ingredients.length > 0 ? (
        <>
          <Text style={styles.section}>配料</Text>
          {post.ingredients.map((ing, i) => <Text key={i} style={styles.item}>· {ing}</Text>)}
        </>
      ) : null}
      {post.steps.length > 0 ? (
        <>
          <Text style={styles.section}>步骤</Text>
          {post.steps.map((s, i) => <Text key={i} style={styles.item}>{i + 1}. {s}</Text>)}
        </>
      ) : null}

      <TouchableOpacity style={[styles.likeBtn, post.liked_by_me && styles.likeBtnActive]} onPress={toggleLike} disabled={busy}>
        <Text style={styles.likeText}>{post.liked_by_me ? '❤️ 已赞' : '🤍 点赞'} · {post.likes_count}</Text>
      </TouchableOpacity>

      {user && user.id === post.author_id ? (
        <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
          <Text style={styles.deleteText}>🗑 删除我的配方</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.section}>评论 {comments.length}</Text>
      {comments.map((c) => (
        <View key={c.id} style={styles.comment}>
          <TouchableOpacity style={styles.commentHead} onPress={() => navigation.navigate('UserProfile', { userId: c.user_id })}>
            {c.avatar ? <Image source={{ uri: resolveImg(c.avatar) || undefined }} style={styles.avatarTiny} /> : null}
            <Text style={styles.commentAuthor}>@{c.username}</Text>
          </TouchableOpacity>
          <Text style={styles.commentText}>{c.content}</Text>
          <Text style={styles.commentTime}>{formatTime(c.created_at)}</Text>
        </View>
      ))}
      {comments.length === 0 ? <Text style={styles.empty}>还没有评论</Text> : null}

      {user ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="写下你的评论…"
            placeholderTextColor={theme.colors.muted}
            value={comment}
            onChangeText={setComment}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={submitComment} disabled={busy}><Text style={styles.sendText}>发送</Text></TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.empty}>登录后可评论和点赞</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: spacing(5), paddingBottom: spacing(12) },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.bg },
  error: { color: theme.colors.danger, fontSize: 14 },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.text },
  meta: { fontSize: 13, color: theme.colors.muted, marginTop: spacing(2) },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginTop: spacing(2) },
  avatarSmall: { width: 20, height: 20, borderRadius: 10 },
  avatarTiny: { width: 18, height: 18, borderRadius: 9 },
  commentHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  image: { width: '100%', height: 200, borderRadius: theme.radius, marginTop: spacing(4) },
  section: { fontSize: 17, fontWeight: '700', color: theme.colors.text, marginTop: spacing(5), marginBottom: spacing(2) },
  item: { fontSize: 15, color: theme.colors.text, lineHeight: 26 },
  likeBtn: { marginTop: spacing(5), borderRadius: 12, paddingVertical: spacing(3), alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card },
  likeBtnActive: { borderColor: theme.colors.like, backgroundColor: '#FBE9E9' },
  likeText: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  deleteBtn: { marginTop: spacing(2), borderRadius: 12, paddingVertical: spacing(3), alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card },
  deleteText: { fontSize: 15, fontWeight: '700', color: theme.colors.danger },
  comment: { backgroundColor: theme.colors.card, borderRadius: 12, padding: spacing(3), marginTop: spacing(2), borderWidth: 1, borderColor: theme.colors.border },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: theme.colors.primaryDark },
  commentText: { fontSize: 15, color: theme.colors.text, marginTop: spacing(1), lineHeight: 21 },
  commentTime: { fontSize: 12, color: theme.colors.muted, marginTop: spacing(1) },
  empty: { color: theme.colors.muted, fontSize: 14, marginTop: spacing(2) },
  inputRow: { flexDirection: 'row', gap: spacing(2), marginTop: spacing(5) },
  input: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: spacing(3), color: theme.colors.text, fontSize: 15, backgroundColor: theme.colors.card },
  sendBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingHorizontal: spacing(4), justifyContent: 'center' },
  sendText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
