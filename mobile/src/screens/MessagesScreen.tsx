import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api, resolveImg } from '../api';
import { useRealtime } from '../RealtimeContext';
import { Conversation } from '../types';
import { theme, spacing } from '../theme';

export default function MessagesScreen() {
  const navigation = useNavigation<any>();
  const { event, onlineUsers } = useRealtime();
  const [items, setItems] = useState<Conversation[]>([]);
  const load = useCallback(async () => { try { setItems((await api.conversations()) as Conversation[]); } catch (e) {} }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { if (event && ['message', 'messages-read', 'presence'].includes(event.type)) load(); }, [event?.eventId, load]);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={items}
      keyExtractor={(item) => String(item.user.id)}
      renderItem={({ item }) => {
        const online = onlineUsers.has(item.user.id) || item.online;
        return (
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Chat', { userId: item.user.id, username: item.user.username })}>
            <View>
              {item.user.avatar ? <Image source={{ uri: resolveImg(item.user.avatar) || undefined }} style={styles.avatar} /> : <Text style={styles.avatarFallback}>🍹</Text>}
              <View style={[styles.dot, online && styles.dotOnline]} />
            </View>
            <View style={styles.body}>
              <Text style={styles.name}>@{item.user.username}</Text>
              <Text style={styles.preview} numberOfLines={1}>{item.last_message}</Text>
            </View>
            {item.unread_count > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{item.unread_count}</Text></View> : null}
          </TouchableOpacity>
        );
      }}
      ItemSeparatorComponent={() => <View style={{ height: spacing(2) }} />}
      ListEmptyComponent={<Text style={styles.empty}>还没有私信，从用户主页开始聊天吧</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  list: { padding: spacing(5), paddingBottom: spacing(10) },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: spacing(3) },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { fontSize: 38, width: 48, textAlign: 'center' },
  dot: { position: 'absolute', right: 0, bottom: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: theme.colors.muted, borderWidth: 2, borderColor: theme.colors.card },
  dotOnline: { backgroundColor: '#22C55E' },
  body: { flex: 1, marginLeft: spacing(3) },
  name: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  preview: { fontSize: 14, color: theme.colors.muted, marginTop: 3 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  empty: { color: theme.colors.muted, textAlign: 'center', marginTop: spacing(10) },
});
