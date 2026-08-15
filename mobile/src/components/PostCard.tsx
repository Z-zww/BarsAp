import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Post } from '../types';
import { theme, spacing } from '../theme';

function formatTime(s: string) {
  if (!s) return '';
  return s.replace('T', ' ').slice(0, 16);
}

export default function PostCard({ post, onPress }: { post: Post; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.title}>{post.title}</Text>
      {post.ingredients.length > 0 ? (
        <Text style={styles.ingredients} numberOfLines={2}>{post.ingredients.join(' · ')}</Text>
      ) : null}
      <View style={styles.meta}>
        <Text style={styles.author}>@{post.author}</Text>
        <Text style={styles.stat}>👍 {post.likes_count}</Text>
        <Text style={styles.stat}>💬 {post.comments_count}</Text>
        <Text style={styles.time}>{formatTime(post.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.card, borderRadius: theme.radius, padding: spacing(4), borderWidth: 1, borderColor: theme.colors.border },
  title: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  ingredients: { fontSize: 14, color: theme.colors.muted, marginTop: spacing(2), lineHeight: 20 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginTop: spacing(3) },
  author: { fontSize: 13, color: theme.colors.primaryDark, fontWeight: '600' },
  stat: { fontSize: 13, color: theme.colors.muted },
  time: { fontSize: 12, color: theme.colors.muted, marginLeft: 'auto' },
});
