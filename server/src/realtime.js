const { WebSocketServer, WebSocket } = require('ws');

function createRealtimeHub(db) {
  const socketsByUser = new Map();
  let wss = null;

  function sendSocket(socket, payload) {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
  }

  function sendTo(userId, payload) {
    const sockets = socketsByUser.get(Number(userId));
    if (sockets) for (const socket of sockets) sendSocket(socket, payload);
  }

  function broadcast(payload) {
    if (!wss) return;
    for (const socket of wss.clients) sendSocket(socket, payload);
  }

  function setPresence(userId, online) {
    broadcast({ type: 'presence', userId: Number(userId), online });
  }

  async function pushToExpo(userId, notification) {
    const rows = await db.prepare('SELECT token FROM push_tokens WHERE user_id = ?').all(userId);
    const messages = rows
      .filter((row) => /^Expo(nent)?PushToken\[/.test(String(row.token)))
      .map((row) => ({
        to: row.token,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data,
      }));
    if (!messages.length) return;
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
    } catch (error) { console.warn('[push]', error.message); }
  }

  async function notify(userId, type, title, body, data = {}) {
    if (!userId) return null;
    const info = await db.prepare('INSERT INTO notifications (user_id, type, title, body, data) VALUES (?, ?, ?, ?, ?)')
      .run(userId, type, title, body, JSON.stringify(data));
    const notification = {
      id: Number(info.lastInsertRowid), type, title, body, data,
      read_at: null, created_at: new Date().toISOString(),
    };
    sendTo(userId, { type: 'notification', notification });
    pushToExpo(userId, notification).catch(() => {});
    return notification;
  }

  function attach(server) {
    wss = new WebSocketServer({ server, path: '/ws' });
    wss.on('connection', async (socket, request) => {
      try {
        const url = new URL(request.url, 'http://localhost');
        const token = url.searchParams.get('token') || '';
        const session = await db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token);
        if (!session) return socket.close(4001, 'Unauthorized');
        const userId = Number(session.user_id);
        socket.userId = userId;
        if (!socketsByUser.has(userId)) socketsByUser.set(userId, new Set());
        const sockets = socketsByUser.get(userId);
        const wasOffline = sockets.size === 0;
        sockets.add(socket);
        if (wasOffline) setPresence(userId, true);
        sendSocket(socket, { type: 'connected', userId });

        socket.on('message', (raw) => {
          try {
            const message = JSON.parse(String(raw));
            if (message.type === 'ping') sendSocket(socket, { type: 'pong' });
          } catch (error) {}
        });
        socket.on('close', () => {
          sockets.delete(socket);
          if (sockets.size === 0) {
            socketsByUser.delete(userId);
            setPresence(userId, false);
          }
        });
      } catch (error) { socket.close(1011, 'Connection failed'); }
    });
  }

  return {
    attach, sendTo, broadcast, notify,
    isOnline: (userId) => socketsByUser.has(Number(userId)),
  };
}

module.exports = { createRealtimeHub };
