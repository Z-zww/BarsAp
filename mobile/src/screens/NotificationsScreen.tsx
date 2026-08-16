import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../api';
import { useRealtime } from '../RealtimeContext';
import { AppNotification } from '../types';
import { theme, spacing } from '../theme';

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { event } = useRealtime();
  const [items, setItems] = useState<AppNotification[]>([]);
  const load = useCallback(async () => { try { setItems((await api.notifications()) as AppNotification[]); } catch (e) {} }, []);
  useFocusEffect(useCallback(() => { load(); return () => { api.readNotifications().catch(() => {}); }; }, [load]));
  useEffect(() => { if (event?.type === 'notification') load(); }, [event?.eventId, load]);

  const open = (item: AppNotification) => {
    if (item.data.postId) navigation.navigate('PostDetail', { id: item.data.postId });
    else if (item.data.userId && item.type === 'message') navigation.navigate('Chat', { userId: item.data.userId });
    else if (item.data.userId) navigation.navigate('UserProfile', { userId: item.data.userId });
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <TouchableOpacity style={[styles.item, !item.read_at && styles.unread]} onPress={() => open(item)}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
          <Text style={styles.time}>{String(item.created_at).replace('T', ' ').slice(0, 16)}</Text>
        </TouchableOpacity>
      )}
      ItemSeparatorComponent={() => <View style={{ height: spacing(2) }} />}
      ListEmptyComponent={<Text style={styles.empty}>暂时没有通知</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  list: { padding: spacing(5), paddingBottom: spacing(10) },
  item: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: spacing(3) },
  unread: { borderLeftWidth: 4, borderLeftColor: theme.colors.primary },
  title: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  body: { fontSize: 14, color: theme.colors.text, marginTop: spacing(1), lineHeight: 20 },
  time: { fontSize: 12, color: theme.colors.muted, marginTop: spacing(2) },
  empty: { textAlign: 'center', color: theme.colors.muted, marginTop: spacing(10) },
});
