try { require('dotenv').config(); } catch (e) {}
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');
const { decryptText } = require('./crypto');
const { zhToEn, enToZhBatch, translateDrinkDetails, hasChinese } = require('./translate');
const { beijingDate, beijingNow } = require('./time');
const { createDb } = require('./db');
const { hashPassword, verifyPassword, newToken, requireAuth, optionalAuth } = require('./auth');
const { MOODS, MOOD_MAP } = require('./moods-meta');
const { createRealtimeHub } = require('./realtime');

const db = createDb();
const realtime = createRealtimeHub(db);
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/img', express.static(path.join(__dirname, '..', 'public', 'img'), { maxAge: '30d' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));

const PORT = parseInt(process.env.PORT || '4000', 10);

function parseDrink(r) {
  return {
    id: r.id, name: r.name, nameEn: r.name_en, category: r.category,
    moods: JSON.parse(r.moods), image: r.image, summary: r.summary,
    history: r.history, ingredients: JSON.parse(r.ingredients),
    steps: JSON.parse(r.steps), videos: JSON.parse(r.videos), tags: JSON.parse(r.tags),
  };
}

// TheCocktailDB 网络酒品 → 本应用结构
const CATEGORY_ZH = {
  'Ordinary Drink': '经典鸡尾酒', Cocktail: '鸡尾酒', Shake: '奶昔调饮',
  'Other / Unknown': '其他调饮', Cocoa: '可可饮品', Shot: '烈酒杯',
  'Coffee / Tea': '咖啡与茶饮', 'Homemade Liqueur': '自制利口酒',
  'Punch / Party Drink': '潘趣与聚会饮品', Beer: '啤酒调饮',
  'Soft Drink': '无酒精饮品', 'New Era Drinks': '现代鸡尾酒',
};
const ALCOHOL_ZH = { Alcoholic: '含酒精', 'Non alcoholic': '无酒精', 'Optional alcohol': '可选酒精' };

function mapNetworkDrink(d) {
  if (!d || !d.strDrink) return null;
  const ingredients = [];
  for (let i = 1; i <= 15; i++) {
    const name = (d['strIngredient' + i] || '').trim();
    if (name) ingredients.push({ name, amount: (d['strMeasure' + i] || '').trim() });
  }
  const steps = (d.strInstructions || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (steps.length === 0 && d.strInstructions) steps.push(String(d.strInstructions).trim());
  const kw = encodeURIComponent((d.strDrink || '') + ' 调酒');
  const category = CATEGORY_ZH[d.strCategory] || d.strCategory || '鸡尾酒';
  const alcoholic = ALCOHOL_ZH[d.strAlcoholic] || d.strAlcoholic || '';
  return {
    id: 'net-' + d.idDrink,
    name: d.strDrink,
    nameEn: d.strDrink,
    category,
    moods: [],
    image: d.strDrinkThumb || '',
    summary: category + (alcoholic ? ' · ' + alcoholic : ''),
    history: '',
    ingredients,
    steps,
    videos: [
      { title: '抖音搜「' + d.strDrink + '」', url: 'https://www.douyin.com/search/' + kw },
      { title: '小红书搜「' + d.strDrink + '」', url: 'https://www.xiaohongshu.com/search_result?keyword=' + kw },
    ],
    tags: [d.strGlass || '', d.strCategory || ''].filter(Boolean),
  };
}

async function parsePost(r, meId) {
  return {
    id: r.id, title: r.title,
    ingredients: JSON.parse(r.ingredients),
    steps: JSON.parse(r.steps),
    image: r.image, created_at: r.created_at,
    author: r.username,
    author_id: Number(r.user_id),
    author_avatar: r.author_avatar || null,
    likes_count: r.likes_count || 0,
    comments_count: r.comments_count || 0,
    liked_by_me: meId ? !!(await db.prepare('SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?').get(r.id, meId)) : false,
  };
}

function isDateStr(s) {
  if (typeof s !== 'string') return false;
  const m = s.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
  if (!m) return false;
  const mo = +m[2], d = +m[3];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= 31;
}

// ---------------- 基础 ----------------
app.get('/', (req, res) => res.json({ ok: true, name: 'Drinker API', version: '1.0.0' }));

// ---------------- 认证 ----------------
app.post('/api/auth/register', async (req, res) => {
  const username = ((req.body || {}).username || '').trim();
  const password = (req.body || {}).password || '';
  if (username.length < 2 || username.length > 20 || username.includes(' '))
    return res.status(400).json({ error: '用户名需 2-20 位，且不能含空格' });
  if (typeof password !== 'string' || password.length < 6)
    return res.status(400).json({ error: '密码至少 6 位' });
  if (await db.prepare('SELECT id FROM users WHERE username = ?').get(username))
    return res.status(409).json({ error: '用户名已存在' });
  const { salt, hash } = hashPassword(password);
  const info = await db.prepare('INSERT INTO users (username, salt, hash) VALUES (?, ?, ?)').run(username, salt, hash);
  const token = newToken();
  await db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, Number(info.lastInsertRowid));
  res.status(201).json({ token, user: { id: Number(info.lastInsertRowid), username } });
});

app.post('/api/auth/login', async (req, res) => {
  const username = ((req.body || {}).username || '').trim();
  const password = (req.body || {}).password || '';
  const u = await db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!u || !verifyPassword(password, u.salt, u.hash))
    return res.status(401).json({ error: '用户名或密码错误' });
  const token = newToken();
  await db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, u.id);
  res.json({ token, user: { id: u.id, username: u.username } });
});

app.post('/api/auth/logout', requireAuth(db), async (req, res) => {
  await db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token);
  res.json({ ok: true });
});

app.get('/api/me', requireAuth(db), async (req, res) => {
  const u = await db.prepare('SELECT id, username, avatar FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: { id: u.id, username: u.username, avatar: u.avatar || null } });
});

// ---------------- 心情 ----------------
app.get('/api/moods/meta', (req, res) => res.json(MOODS));

app.get('/api/moods/today', requireAuth(db), async (req, res) => {
  const today = beijingDate();
  const row = await db.prepare('SELECT date, mood, note FROM moods WHERE user_id = ? AND date = ?').get(req.user.id, today);
  res.json({ date: today, mood: row ? { date: row.date, mood: row.mood, note: row.note, emoji: MOOD_MAP[row.mood] ? MOOD_MAP[row.mood].emoji : '', label: MOOD_MAP[row.mood] ? MOOD_MAP[row.mood].label : '' } : null });
});

app.get('/api/moods', requireAuth(db), async (req, res) => {
  const month = req.query.month; // YYYY-MM
  let rows;
  if (month && /^[0-9]{4}-[0-9]{2}$/.test(month)) {
    rows = await db.prepare('SELECT date, mood, note FROM moods WHERE user_id = ? AND date LIKE ? ORDER BY date').all(req.user.id, month + '%');
  } else {
    rows = await db.prepare('SELECT date, mood, note FROM moods WHERE user_id = ? ORDER BY date').all(req.user.id);
  }
  const list = rows.map((r) => ({ date: r.date, mood: r.mood, note: r.note, emoji: MOOD_MAP[r.mood] ? MOOD_MAP[r.mood].emoji : '', label: MOOD_MAP[r.mood] ? MOOD_MAP[r.mood].label : '' }));
  res.json(list);
});

app.post('/api/moods', requireAuth(db), async (req, res) => {
  const { date, mood, note } = req.body || {};
  if (!isDateStr(date)) return res.status(400).json({ error: 'date 需为 YYYY-MM-DD' });
  if (mood !== undefined && mood !== null && !MOOD_MAP[mood]) return res.status(400).json({ error: '未知心情' });
  const existing = await db.prepare('SELECT * FROM moods WHERE user_id = ? AND date = ?').get(req.user.id, date);
  const m = mood !== undefined ? (mood || null) : (existing ? existing.mood : null);
  const n = note !== undefined ? ((note === null || note === '') ? null : String(note)) : (existing ? existing.note : null);
  await db.prepare('INSERT INTO moods (user_id, date, mood, note) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, date) DO UPDATE SET mood = excluded.mood, note = excluded.note')
    .run(req.user.id, date, m, n);
  res.json({ ok: true });
});

app.delete('/api/moods/:date', requireAuth(db), async (req, res) => {
  if (!isDateStr(req.params.date)) return res.status(400).json({ error: 'date 需为 YYYY-MM-DD' });
  await db.prepare('DELETE FROM moods WHERE user_id = ? AND date = ?').run(req.user.id, req.params.date);
  res.json({ ok: true });
});

// ---------------- 酒品 ----------------
app.get('/api/drinks', async (req, res) => {
  const mood = req.query.mood;
  const q = req.query.q ? String(req.query.q).toLowerCase() : '';
  let rows = (await db.prepare('SELECT * FROM drinks').all()).map(parseDrink);
  if (q) {
    rows = rows.filter((d) => (d.name + ' ' + (d.nameEn || '') + ' ' + (d.summary || '') + ' ' + (d.history || '') + ' ' + d.tags.join(' ')).toLowerCase().includes(q));
  }
  if (mood) {
    rows.sort((a, b) => (b.moods.includes(mood) ? 1 : 0) - (a.moods.includes(mood) ? 1 : 0));
  }
  const limit = req.query.limit ? Math.min(parseInt(req.query.limit, 10) || 50, 50) : rows.length;
  res.json(rows.slice(0, limit));
});

// 确定性洗牌（按日期+批次，保证当天稳定、跨天轮换）
function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h >>> 0;
}
function seededShuffle(arr, seed) {
  const a = arr.slice();
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

// 每日推荐：心情匹配优先，按日期+批次轮换，可多推几款
app.get('/api/drinks/recommend', async (req, res) => {
  const mood = req.query.mood;
  const date = req.query.date || beijingDate();
  const batch = parseInt(req.query.batch || '0', 10) || 0;
  let rows = (await db.prepare('SELECT * FROM drinks').all()).map(parseDrink);
  if (mood) {
    const match = rows.filter((d) => d.moods.includes(mood));
    const rest = rows.filter((d) => !d.moods.includes(mood));
    rows = seededShuffle(match, hashCode(date + '|' + mood + '|' + batch))
      .concat(seededShuffle(rest, hashCode(date + '|r|' + batch)));
  } else {
    rows = seededShuffle(rows, hashCode(date + '|' + batch));
  }
  const limit = Math.min(parseInt(req.query.limit || '6', 10) || 6, 20);
  res.json(rows.slice(0, limit));
});

// 网络酒库搜索（TheCocktailDB，600+ 款，支持中英双语 + 中文名）
app.get('/api/drinks/network', async (req, res) => {
  const rawQ = (req.query.q || '').trim();
  if (!rawQ) return res.json([]);
  let q = rawQ;
  if (hasChinese(q)) { try { q = await zhToEn(q); } catch (e) {} }
  const url = 'https://www.thecocktaildb.com/api/json/v1/1/search.php?s=' + encodeURIComponent(q);
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, async (r) => {
    let data = '';
    r.on('data', (c) => data += c);
    r.on('end', async () => {
      try {
        const j = JSON.parse(data);
        const drinks = (j.drinks || []).map(mapNetworkDrink).filter(Boolean).slice(0, 20);
        const names = drinks.map((d) => d.nameEn || d.name);
        const zh = await enToZhBatch(names);
        for (let i = 0; i < drinks.length; i++) drinks[i].name = zh[i] || drinks[i].name;
        res.json(drinks);
      } catch (e) { res.json([]); }
    });
  }).on('error', () => res.json([]));
});

app.get('/api/drinks/:id', async (req, res) => {
  if (req.params.id.startsWith('net-')) {
    const networkId = req.params.id.slice(4);
    const url = 'https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=' + encodeURIComponent(networkId);
    return https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      let data = '';
      response.on('data', (chunk) => data += chunk);
      response.on('end', async () => {
        try {
          const json = JSON.parse(data);
          const drink = mapNetworkDrink((json.drinks || [])[0]);
          if (!drink) return res.status(404).json({ error: '未找到该酒品' });
          res.json(await translateDrinkDetails(drink));
        } catch (e) { res.status(502).json({ error: '网络酒品详情加载失败' }); }
      });
    }).on('error', () => res.status(502).json({ error: '网络酒品详情加载失败' }));
  }
  const r = await db.prepare('SELECT * FROM drinks WHERE id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ error: '未找到该酒品' });
  res.json(parseDrink(r));
});

// ---------------- 上传 / 头像 ----------------
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

app.get('/api/media/:id', async (req, res) => {
  const media = await db.prepare('SELECT mime_type, data FROM media WHERE id = ?').get(req.params.id);
  if (!media) return res.status(404).json({ error: '图片不存在' });
  res.set('Content-Type', media.mime_type);
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(Buffer.from(media.data));
});

app.post('/api/upload', requireAuth(db), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未收到文件' });
  const data = await sharp(req.file.buffer)
    .rotate()
    .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 75, mozjpeg: true })
    .toBuffer();
  const id = crypto.randomUUID();
  await db.prepare('INSERT INTO media (id, user_id, mime_type, data) VALUES (?, ?, ?, ?)')
    .run(id, req.user.id, 'image/jpeg', new Uint8Array(data));
  res.json({ url: '/api/media/' + id });
});

app.post('/api/me/avatar', requireAuth(db), async (req, res) => {
  const url = ((req.body || {}).url || '').trim();
  if (!url) return res.status(400).json({ error: '缺少头像地址' });
  await db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(url, req.user.id);
  res.json({ ok: true, avatar: url });
});

// ---------------- 用户、关注、私信与通知 ----------------
app.get('/api/users/:id', optionalAuth(db), async (req, res) => {
  const target = await db.prepare('SELECT id, username, avatar FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  const followers = await db.prepare('SELECT COUNT(*) AS c FROM follows WHERE following_id = ?').get(target.id);
  const following = await db.prepare('SELECT COUNT(*) AS c FROM follows WHERE follower_id = ?').get(target.id);
  const posts = await db.prepare('SELECT COUNT(*) AS c FROM posts WHERE user_id = ?').get(target.id);
  const followedByMe = req.user
    ? !!(await db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(req.user.id, target.id))
    : false;
  res.json({
    user: { id: Number(target.id), username: target.username, avatar: target.avatar || null },
    followers_count: Number(followers.c), following_count: Number(following.c), posts_count: Number(posts.c),
    followed_by_me: followedByMe, online: realtime.isOnline(target.id),
  });
});

app.post('/api/users/:id/follow', requireAuth(db), async (req, res) => {
  const targetId = Number(req.params.id);
  if (!targetId || targetId === req.user.id) return res.status(400).json({ error: '不能关注自己' });
  const target = await db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  const existing = await db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(req.user.id, targetId);
  if (existing) {
    await db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(req.user.id, targetId);
    return res.json({ following: false });
  }
  await db.prepare('INSERT INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)').run(req.user.id, targetId, beijingNow());
  await realtime.notify(targetId, 'follow', '新的关注', '@' + req.user.username + ' 关注了你', { userId: req.user.id });
  res.json({ following: true });
});

app.get('/api/conversations', requireAuth(db), async (req, res) => {
  const rows = await db.prepare('SELECT *, CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS other_id FROM messages WHERE sender_id = ? OR receiver_id = ? ORDER BY id DESC')
    .all(req.user.id, req.user.id, req.user.id);
  const latestByUser = new Map();
  for (const row of rows) {
    const otherId = Number(row.other_id);
    if (!latestByUser.has(otherId)) latestByUser.set(otherId, row);
  }
  const conversations = await Promise.all(Array.from(latestByUser.entries()).map(async ([otherId, row]) => {
    const other = await db.prepare('SELECT id, username, avatar FROM users WHERE id = ?').get(otherId);
    const unread = await db.prepare('SELECT COUNT(*) AS c FROM messages WHERE sender_id = ? AND receiver_id = ? AND read_at IS NULL').get(otherId, req.user.id);
    return {
      user: { id: otherId, username: other.username, avatar: other.avatar || null },
      last_message: row.content, last_message_at: row.created_at,
      unread_count: Number(unread.c), online: realtime.isOnline(otherId),
    };
  }));
  res.json(conversations);
});

app.get('/api/messages/:userId', requireAuth(db), async (req, res) => {
  const otherId = Number(req.params.userId);
  const other = await db.prepare('SELECT id, username, avatar FROM users WHERE id = ?').get(otherId);
  if (!other) return res.status(404).json({ error: '用户不存在' });
  await db.prepare('UPDATE messages SET read_at = ? WHERE sender_id = ? AND receiver_id = ? AND read_at IS NULL')
    .run(beijingNow(), otherId, req.user.id);
  const messages = await db.prepare('SELECT id, sender_id, receiver_id, content, created_at, read_at FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY id DESC LIMIT 200')
    .all(req.user.id, otherId, otherId, req.user.id);
  realtime.sendTo(otherId, { type: 'messages-read', userId: req.user.id });
  res.json({
    user: { id: otherId, username: other.username, avatar: other.avatar || null },
    online: realtime.isOnline(otherId), messages: messages.reverse().map((m) => ({ ...m, id: Number(m.id), sender_id: Number(m.sender_id), receiver_id: Number(m.receiver_id) })),
  });
});

app.post('/api/messages/:userId', requireAuth(db), async (req, res) => {
  const receiverId = Number(req.params.userId);
  const content = decryptText(String((req.body || {}).content || '')).trim();
  if (!receiverId || receiverId === req.user.id) return res.status(400).json({ error: '不能给自己发私信' });
  if (!content || content.length > 1000) return res.status(400).json({ error: '消息内容需为 1-1000 字' });
  const receiver = await db.prepare('SELECT id FROM users WHERE id = ?').get(receiverId);
  if (!receiver) return res.status(404).json({ error: '用户不存在' });
  const createdAt = beijingNow();
  const info = await db.prepare('INSERT INTO messages (sender_id, receiver_id, content, created_at) VALUES (?, ?, ?, ?)')
    .run(req.user.id, receiverId, content, createdAt);
  const message = { id: Number(info.lastInsertRowid), sender_id: req.user.id, receiver_id: receiverId, content, created_at: createdAt, read_at: null };
  realtime.sendTo(receiverId, { type: 'message', message, sender: { id: req.user.id, username: req.user.username } });
  await realtime.notify(receiverId, 'message', '@' + req.user.username + ' 发来私信', content.slice(0, 80), { userId: req.user.id });
  res.status(201).json(message);
});

app.get('/api/notifications', requireAuth(db), async (req, res) => {
  const rows = await db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 100').all(req.user.id);
  res.json(rows.map((row) => ({ ...row, id: Number(row.id), data: JSON.parse(row.data || '{}') })));
});

app.post('/api/notifications/read', requireAuth(db), async (req, res) => {
  await db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').run(beijingNow(), req.user.id);
  res.json({ ok: true });
});

app.post('/api/push-token', requireAuth(db), async (req, res) => {
  const token = String((req.body || {}).token || '').trim();
  const platform = String((req.body || {}).platform || '').trim();
  if (!token) return res.status(400).json({ error: '缺少推送令牌' });
  await db.prepare('INSERT INTO push_tokens (token, user_id, platform) VALUES (?, ?, ?) ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, platform = excluded.platform')
    .run(token, req.user.id, platform || null);
  res.json({ ok: true });
});

// ---------------- 收藏 / 个人酒库 ----------------
app.get('/api/favorites', requireAuth(db), async (req, res) => {
  const rows = await db.prepare('SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC, id DESC').all(req.user.id);
  res.json(rows.map((r) => JSON.parse(r.data)));
});

app.post('/api/favorites', requireAuth(db), async (req, res) => {
  const drink = (req.body || {}).drink || {};
  const id = drink.id;
  if (!id) return res.status(400).json({ error: '缺少酒品 id' });
  const exists = await db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND drink_id = ?').get(req.user.id, id);
  if (exists) {
    await db.prepare('DELETE FROM favorites WHERE user_id = ? AND drink_id = ?').run(req.user.id, id);
    return res.json({ favorited: false });
  }
  await db.prepare('INSERT INTO favorites (user_id, drink_id, name, name_en, image, data) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.user.id, id, drink.name || '', drink.nameEn || null, drink.image || null, JSON.stringify(drink));
  res.json({ favorited: true });
});

// ---------------- 社区 ----------------
app.get('/api/posts', optionalAuth(db), async (req, res) => {
  let rows;
  if (req.query.mine === '1') {
    if (!req.user) return res.status(401).json({ error: '未登录' });
    rows = await db.prepare('SELECT p.*, u.username, u.avatar AS author_avatar, (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count, (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count FROM posts p JOIN users u ON u.id = p.user_id WHERE p.user_id = ?').all(req.user.id);
  } else if (req.query.userId && /^\d+$/.test(String(req.query.userId))) {
    rows = await db.prepare('SELECT p.*, u.username, u.avatar AS author_avatar, (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count, (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count FROM posts p JOIN users u ON u.id = p.user_id WHERE p.user_id = ?').all(Number(req.query.userId));
  } else {
    rows = await db.prepare('SELECT p.*, u.username, u.avatar AS author_avatar, (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count, (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count FROM posts p JOIN users u ON u.id = p.user_id').all();
  }
  const meId = req.user ? req.user.id : null;
  const posts = await Promise.all(rows.map((r) => parsePost(r, meId)));
  if (req.query.sort === 'hot') posts.sort((a, b) => (b.likes_count + b.comments_count * 2) - (a.likes_count + a.comments_count * 2));
  else posts.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  res.json(posts);
});

app.post('/api/posts', requireAuth(db), async (req, res) => {
  const { title, ingredients, steps, image } = req.body || {};
  const decTitle = decryptText(title);
  if (typeof decTitle !== 'string' || decTitle.trim().length === 0 || decTitle.length > 100)
    return res.status(400).json({ error: '标题不能为空且不超过 100 字' });
  const ings = Array.isArray(ingredients) ? ingredients.map((x) => decryptText(String(x))) : [];
  const stps = Array.isArray(steps) ? steps.map((x) => decryptText(String(x))) : [];
  if (stps.length === 0) return res.status(400).json({ error: '至少写一个步骤' });
  const info = await db.prepare('INSERT INTO posts (user_id, title, ingredients, steps, image, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.user.id, decTitle.trim(), JSON.stringify(ings), JSON.stringify(stps), image || null, beijingNow());
  realtime.broadcast({ type: 'community', action: 'post-created', postId: Number(info.lastInsertRowid) });
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

app.get('/api/posts/:id', optionalAuth(db), async (req, res) => {
  const r = await db.prepare('SELECT p.*, u.username, (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count, (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ error: '帖子不存在' });
  const comments = await db.prepare('SELECT c.id, c.user_id, c.content, c.created_at, u.username, u.avatar FROM comments c JOIN users u ON u.id = c.user_id WHERE c.post_id = ? ORDER BY c.created_at').all(r.id);
  res.json({ post: await parsePost(r, req.user ? req.user.id : null), comments });
});

app.post('/api/posts/:id/like', requireAuth(db), async (req, res) => {
  const post = await db.prepare('SELECT id, user_id, title FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  const existing = await db.prepare('SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?').get(post.id, req.user.id);
  if (existing) await db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').run(post.id, req.user.id);
  else await db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(post.id, req.user.id);
  const count = (await db.prepare('SELECT COUNT(*) AS c FROM likes WHERE post_id = ?').get(post.id)).c;
  if (!existing && Number(post.user_id) !== req.user.id) {
    await realtime.notify(Number(post.user_id), 'like', '配方收到新点赞', '@' + req.user.username + ' 赞了「' + post.title + '」', { postId: Number(post.id) });
  }
  realtime.broadcast({ type: 'community', action: 'like', postId: Number(post.id), likesCount: Number(count) });
  res.json({ liked: !existing, likes_count: count });
});

app.post('/api/posts/:id/comments', requireAuth(db), async (req, res) => {
  const post = await db.prepare('SELECT id, user_id, title FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  const content = decryptText(((req.body || {}).content || '').trim());
  if (!content || content.length > 500) return res.status(400).json({ error: '评论内容 1-500 字' });
  const now = beijingNow();
  const info = await db.prepare('INSERT INTO comments (post_id, user_id, content, created_at) VALUES (?, ?, ?, ?)').run(post.id, req.user.id, content, now);
  if (Number(post.user_id) !== req.user.id) {
    await realtime.notify(Number(post.user_id), 'comment', '配方收到新评论', '@' + req.user.username + ' 评论了「' + post.title + '」', { postId: Number(post.id) });
  }
  realtime.broadcast({ type: 'community', action: 'comment', postId: Number(post.id) });
  res.status(201).json({ id: Number(info.lastInsertRowid), username: req.user.username, content, created_at: now });
});

app.delete('/api/posts/:id', requireAuth(db), async (req, res) => {
  const post = await db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  if (post.user_id !== req.user.id) return res.status(403).json({ error: '只能删除自己的帖子' });
  await db.prepare('DELETE FROM comments WHERE post_id = ?').run(post.id);
  await db.prepare('DELETE FROM likes WHERE post_id = ?').run(post.id);
  await db.prepare('DELETE FROM posts WHERE id = ?').run(post.id);
  realtime.broadcast({ type: 'community', action: 'post-deleted', postId: Number(post.id) });
  res.json({ ok: true });
});

app.delete('/api/comments/:id', requireAuth(db), async (req, res) => {
  const c = await db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: '评论不存在' });
  if (c.user_id !== req.user.id) return res.status(403).json({ error: '只能删除自己的评论' });
  await db.prepare('DELETE FROM comments WHERE id = ?').run(c.id);
  res.json({ ok: true });
});

// 404 兜底
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

db.ready.then(() => {
  const server = http.createServer(app);
  realtime.attach(server);
  server.listen(PORT, () => {
    console.log('Drinker API listening on http://localhost:' + PORT);
  });
}).catch((error) => {
  console.error('[db] startup failed:', error.message);
  process.exitCode = 1;
});

app.use((error, req, res, next) => {
  console.error('[api]', error);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: '服务器内部错误' });
});

module.exports = app;
