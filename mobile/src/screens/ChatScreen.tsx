import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { api } from '../api';
import { encryptText } from '../crypto';
import { useAuth } from '../AuthContext';
import { useRealtime } from '../RealtimeContext';
import { DirectMessage } from '../types';
import { theme, spacing } from '../theme';

export default function ChatScreen() {
  const route = useRoute<any>();
  const otherId = Number(route.params.userId);
  const { user } = useAuth();
  const { event, onlineUsers } = useRealtime();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState('');
  const [online, setOnline] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try { const r: any = await api.messages(otherId); setMessages(r.messages || []); setOnline(r.online); } catch (e) {}
  }, [otherId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    if (!event) return;
    if ((event.type === 'message' && Number(event.message?.sender_id) === otherId) || event.type === 'messages-read') load();
    if (event.type === 'presence' && Number(event.userId) === otherId) setOnline(Boolean(event.online));
  }, [event?.eventId, otherId, load]);

  const send = async () => {
    const value = text.trim();
    if (!value) return;
    setText('');
    try { const message = await api.sendMessage(otherId, encryptText(value)) as DirectMessage; setMessages((current) => [...current, message]); }
    catch (e) { setText(value); }
  };

  const isOnline = onlineUsers.has(otherId) || online;
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.presence}><View style={[styles.dot, isOnline && styles.dotOnline]} /><Text style={styles.presenceText}>{isOnline ? '在线' : '离线'}</Text></View>
      <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messageContent} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {messages.map((message) => {
          const mine = Number(message.sender_id) === user?.id;
          return <View key={message.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}><Text style={[styles.messageText, mine && styles.mineText]}>{message.content}</Text></View>;
        })}
        {!messages.length ? <Text style={styles.empty}>发一条消息开始聊天</Text> : null}
      </ScrollView>
      <View style={styles.inputRow}>
        <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="输入消息…" placeholderTextColor={theme.colors.muted} multiline />
        <TouchableOpacity style={styles.send} onPress={send}><Text style={styles.sendText}>发送</Text></TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  presence: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(1), paddingVertical: spacing(2), borderBottomWidth: 1, borderColor: theme.colors.border },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.muted },
  dotOnline: { backgroundColor: '#22C55E' },
  presenceText: { fontSize: 12, color: theme.colors.muted },
  messages: { flex: 1 },
  messageContent: { padding: spacing(4), gap: spacing(2) },
  bubble: { maxWidth: '78%', paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: 12 },
  mine: { alignSelf: 'flex-end', backgroundColor: theme.colors.primary },
  theirs: { alignSelf: 'flex-start', backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  messageText: { fontSize: 15, lineHeight: 21, color: theme.colors.text },
  mineText: { color: '#fff' },
  empty: { color: theme.colors.muted, textAlign: 'center', marginTop: spacing(8) },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing(2), padding: spacing(3), borderTopWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card },
  input: { flex: 1, maxHeight: 100, minHeight: 42, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: spacing(3), paddingVertical: spacing(2), color: theme.colors.text, backgroundColor: theme.colors.bg },
  send: { height: 42, justifyContent: 'center', paddingHorizontal: spacing(4), backgroundColor: theme.colors.primary, borderRadius: 12 },
  sendText: { color: '#fff', fontWeight: '700' },
});
