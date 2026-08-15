import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useAuth } from '../AuthContext';
import { getBase, loadApiBase, setApiBase } from '../api';
import { theme, spacing } from '../theme';

export default function ProfileScreen() {
  const { user, loading, login, register, logout } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [savedHint, setSavedHint] = useState('');

  useEffect(() => {
    loadApiBase().then((b) => setServerUrl(b));
  }, []);

  const saveServer = async () => {
    const b = await setApiBase(serverUrl);
    setSavedHint('已保存：' + b);
  };

  const doLogin = async () => {
    setBusy(true); setError('');
    try { await login(username.trim(), password); } catch (e: any) { setError(e.message || '登录失败'); }
    setBusy(false);
  };
  const doRegister = async () => {
    setBusy(true); setError('');
    try { await register(username.trim(), password); } catch (e: any) { setError(e.message || '注册失败'); }
    setBusy(false);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>我的</Text>

      <View style={styles.serverCard}>
        <Text style={styles.serverTitle}>服务器地址</Text>
        <Text style={styles.serverDesc}>手机与电脑连同一 WiFi 时，填电脑的局域网 IP（默认已填好）。保存后立即生效。</Text>
        <TextInput
          style={styles.input}
          placeholder="http://192.168.x.x:4000"
          placeholderTextColor={theme.colors.muted}
          value={serverUrl}
          onChangeText={setServerUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.saveBtn} onPress={saveServer}><Text style={styles.saveBtnText}>保存</Text></TouchableOpacity>
        {savedHint ? <Text style={styles.savedHint}>{savedHint}</Text> : null}
      </View>

      {user ? (
        <>
          <View style={styles.card}>
            <Text style={styles.avatar}>🍹</Text>
            <Text style={styles.username}>@{user.username}</Text>
            <Text style={styles.desc}>记录心情，调配属于你的那杯酒</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}><Text style={styles.logoutText}>退出登录</Text></TouchableOpacity>
        </>
      ) : (
        <View style={styles.card}>
          <Text style={styles.loginTitle}>登录 / 注册</Text>
          <Text style={styles.label}>用户名</Text>
          <TextInput style={styles.input} placeholder="2-20 位，不含空格" placeholderTextColor={theme.colors.muted} value={username} onChangeText={setUsername} autoCapitalize="none" />
          <Text style={styles.label}>密码</Text>
          <TextInput style={styles.input} placeholder="至少 6 位" placeholderTextColor={theme.colors.muted} value={password} onChangeText={setPassword} secureTextEntry />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={doLogin} disabled={busy}><Text style={styles.btnText}>登录</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnGhost, busy && { opacity: 0.6 }]} onPress={doRegister} disabled={busy}><Text style={styles.btnGhostText}>注册新账号</Text></TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: spacing(5), paddingBottom: spacing(10) },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.bg },
  title: { fontSize: 28, fontWeight: '800', color: theme.colors.text },
  serverCard: { backgroundColor: theme.colors.card, borderRadius: theme.radius, padding: spacing(4), borderWidth: 1, borderColor: theme.colors.border, marginTop: spacing(4) },
  serverTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  serverDesc: { fontSize: 13, color: theme.colors.muted, marginTop: spacing(1), lineHeight: 19 },
  input: { alignSelf: 'stretch', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: spacing(3), color: theme.colors.text, fontSize: 15, marginTop: spacing(2), backgroundColor: theme.colors.bg },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: spacing(2), alignItems: 'center', marginTop: spacing(2) },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  savedHint: { color: theme.colors.primaryDark, fontSize: 13, marginTop: spacing(2) },
  card: { backgroundColor: theme.colors.card, borderRadius: theme.radius, padding: spacing(5), borderWidth: 1, borderColor: theme.colors.border, marginTop: spacing(4), alignItems: 'center' },
  avatar: { fontSize: 56 },
  username: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginTop: spacing(2) },
  desc: { fontSize: 14, color: theme.colors.muted, marginTop: spacing(1) },
  loginTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: spacing(2) },
  label: { fontSize: 14, fontWeight: '600', color: theme.colors.text, alignSelf: 'flex-start', marginTop: spacing(3) },
  error: { color: theme.colors.danger, fontSize: 14, marginTop: spacing(3) },
  btn: { alignSelf: 'stretch', backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: spacing(3), alignItems: 'center', marginTop: spacing(4) },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.border },
  btnGhostText: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  logoutBtn: { borderRadius: 12, paddingVertical: spacing(3), alignItems: 'center', marginTop: spacing(5), borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card },
  logoutText: { color: theme.colors.danger, fontSize: 16, fontWeight: '600' },
});
