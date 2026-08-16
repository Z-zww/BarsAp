require('dotenv').config();
const { createClient } = require('@libsql/client');
const { WebSocket } = require('ws');
const sharp = require('sharp');

const BASE = process.env.SMOKE_API_URL || 'http://localhost:4000';
const WS_BASE = BASE.replace(/^http/, 'ws');
const createdUserIds = [];
let socket;

async function request(path, options = {}, token) {
  const response = await fetch(BASE + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(path + ' returned ' + response.status + ': ' + (data.error || ''));
  return data;
}

async function register(prefix) {
  const username = prefix + String(Date.now()).slice(-8);
  const result = await request('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password: 'smoke-test-123' }) });
  createdUserIds.push(result.user.id);
  return result;
}

function waitForEvent(type, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WebSocket event timeout: ' + type)), timeout);
    const handler = (raw) => {
      const event = JSON.parse(String(raw));
      if (event.type === type) {
        clearTimeout(timer); socket.off('message', handler); resolve(event);
      }
    };
    socket.on('message', handler);
  });
}

async function cleanup() {
  if (!createdUserIds.length) return;
  const cloud = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
  const placeholders = createdUserIds.map(() => '?').join(',');
  const args = createdUserIds;
  await cloud.batch([
    { sql: `DELETE FROM push_tokens WHERE user_id IN (${placeholders})`, args },
    { sql: `DELETE FROM notifications WHERE user_id IN (${placeholders})`, args },
    { sql: `DELETE FROM messages WHERE sender_id IN (${placeholders}) OR receiver_id IN (${placeholders})`, args: [...args, ...args] },
    { sql: `DELETE FROM follows WHERE follower_id IN (${placeholders}) OR following_id IN (${placeholders})`, args: [...args, ...args] },
    { sql: `DELETE FROM media WHERE user_id IN (${placeholders})`, args },
    { sql: `DELETE FROM sessions WHERE user_id IN (${placeholders})`, args },
    { sql: `DELETE FROM users WHERE id IN (${placeholders})`, args },
  ], 'write');
  cloud.close();
}

async function main() {
  const a = await register('sa');
  const b = await register('sb');
  socket = new WebSocket(WS_BASE + '/ws?token=' + encodeURIComponent(b.token));
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });

  const followEvent = waitForEvent('notification');
  await request('/api/users/' + b.user.id + '/follow', { method: 'POST', body: '{}' }, a.token);
  await followEvent;

  const messageEvent = waitForEvent('message');
  await request('/api/messages/' + b.user.id, { method: 'POST', body: JSON.stringify({ content: '实时消息测试 😊' }) }, a.token);
  await messageEvent;

  const conversation = await request('/api/messages/' + a.user.id, {}, b.token);
  if (conversation.messages.length !== 1) throw new Error('Message was not persisted');
  const notifications = await request('/api/notifications', {}, b.token);
  if (notifications.length < 2) throw new Error('Notifications were not persisted');

  const image = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#E07A5F' } }).png().toBuffer();
  const form = new FormData();
  form.append('file', new Blob([image], { type: 'image/png' }), 'smoke.png');
  const uploadResponse = await fetch(BASE + '/api/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + a.token }, body: form });
  const upload = await uploadResponse.json();
  if (!uploadResponse.ok || !upload.url) throw new Error('Media upload failed');
  const mediaResponse = await fetch(BASE + upload.url);
  if (!mediaResponse.ok || mediaResponse.headers.get('content-type') !== 'image/jpeg') throw new Error('Media read failed');

  console.log('social smoke test passed: follow, websocket, message, notification, media');
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (socket) socket.close();
  try { await cleanup(); console.log('temporary cloud test data cleaned'); } catch (error) { console.error('cleanup failed:', error.message); process.exitCode = 1; }
});
