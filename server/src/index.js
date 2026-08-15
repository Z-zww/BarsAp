try { require('dotenv').config(); } catch (e) {}
const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const { decryptText } = require('./crypto');
const { zhToEn, enToZhBatch, hasChinese } = require('./translate');
const { beijingDate, beijingNow } = require('./time');
const { createDb } = require('./db');
const { hashPassword, verifyPassword, newToken, requireAuth, optionalAuth } = require('./auth');
const { MOODS, MOOD_MAP } = require('./moods-meta');

const db = createDb();
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/img', express.static(path.join(__dirname, '..', 'public', 'img'), { maxAge: '30d' }));

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
  return {
    id: 'net-' + d.idDrink,
    name: d.strDrink,
    nameEn: d.strDrink,
    category: d.strCategory || '经典',
    moods: [],
    image: d.strDrinkThumb || '',
    summary: (d.strCategory || '') + (d.strAlcoholic ? ' · ' + d.strAlcoholic : ''),
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

function parsePost(r, meId) {
  return {
    id: r.id, title: r.title,
    ingredients: JSON.parse(r.ingredients),
    steps: JSON.parse(r.steps),
    image: r.image, created_at: r.created_at,
    author: r.username,
    likes_count: r.likes_count || 0,
    comments_count: r.comments_count || 0,
    liked_by_me: meId ? !!db.prepare('SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?').get(r.id, meId) : false,
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
app.post('/api/auth/register', (req, res) => {
  const username = ((req.body || {}).username || '').trim();
  const password = (req.body || {}).password || '';
  if (username.length < 2 || username.length > 20 || username.includes(' '))
    return res.status(400).json({ error: '用户名需 2-20 位，且不能含空格' });
  if (typeof password !== 'string' || password.length < 6)
    return res.status(400).json({ error: '密码至少 6 位' });
  if (db.prepare('SELECT id FROM users WHERE username = ?').get(username))
    return res.status(409).json({ error: '用户名已存在' });
  const { salt, hash } = hashPassword(password);
  const info = db.prepare('INSERT INTO users (username, salt, hash) VALUES (?, ?, ?)').run(username, salt, hash);
  const token = newToken();
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, Number(info.lastInsertRowid));
  res.status(201).json({ token, user: { id: Number(info.lastInsertRowid), username } });
});

app.post('/api/auth/login', (req, res) => {
  const username = ((req.body || {}).username || '').trim();
  const password = (req.body || {}).password || '';
  const u = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!u || !verifyPassword(password, u.salt, u.hash))
    return res.status(401).json({ error: '用户名或密码错误' });
  const token = newToken();
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, u.id);
  res.json({ token, user: { id: u.id, username: u.username } });
});

app.post('/api/auth/logout', requireAuth(db), (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token);
  res.json({ ok: true });
});

app.get('/api/me', requireAuth(db), (req, res) => {
  res.json({ user: req.user });
});

// ---------------- 心情 ----------------
app.get('/api/moods/meta', (req, res) => res.json(MOODS));

app.get('/api/moods/today', requireAuth(db), (req, res) => {
  const today = beijingDate();
  const row = db.prepare('SELECT date, mood, note FROM moods WHERE user_id = ? AND date = ?').get(req.user.id, today);
  res.json({ date: today, mood: row ? { date: row.date, mood: row.mood, note: row.note, emoji: MOOD_MAP[row.mood] ? MOOD_MAP[row.mood].emoji : '', label: MOOD_MAP[row.mood] ? MOOD_MAP[row.mood].label : '' } : null });
});

app.get('/api/moods', requireAuth(db), (req, res) => {
  const month = req.query.month; // YYYY-MM
  let rows;
  if (month && /^[0-9]{4}-[0-9]{2}$/.test(month)) {
    rows = db.prepare('SELECT date, mood, note FROM moods WHERE user_id = ? AND date LIKE ? ORDER BY date').all(req.user.id, month + '%');
  } else {
    rows = db.prepare('SELECT date, mood, note FROM moods WHERE user_id = ? ORDER BY date').all(req.user.id);
  }
  const list = rows.map((r) => ({ date: r.date, mood: r.mood, note: r.note, emoji: MOOD_MAP[r.mood] ? MOOD_MAP[r.mood].emoji : '', label: MOOD_MAP[r.mood] ? MOOD_MAP[r.mood].label : '' }));
  res.json(list);
});

app.post('/api/moods', requireAuth(db), (req, res) => {
  const { date, mood, note } = req.body || {};
  if (!isDateStr(date)) return res.status(400).json({ error: 'date 需为 YYYY-MM-DD' });
  if (mood && !MOOD_MAP[mood]) return res.status(400).json({ error: '未知心情' });
  const m = mood || null;
  const n = (note === undefined || note === null || note === '') ? null : String(note);
  db.prepare('INSERT INTO moods (user_id, date, mood, note) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, date) DO UPDATE SET mood = excluded.mood, note = excluded.note')
    .run(req.user.id, date, m, n);
  res.json({ ok: true });
});

app.delete('/api/moods/:date', requireAuth(db), (req, res) => {
  if (!isDateStr(req.params.date)) return res.status(400).json({ error: 'date 需为 YYYY-MM-DD' });
  db.prepare('DELETE FROM moods WHERE user_id = ? AND date = ?').run(req.user.id, req.params.date);
  res.json({ ok: true });
});

// ---------------- 酒品 ----------------
app.get('/api/drinks', (req, res) => {
  const mood = req.query.mood;
  const q = req.query.q ? String(req.query.q).toLowerCase() : '';
  let rows = db.prepare('SELECT * FROM drinks').all().map(parseDrink);
  if (q) {
    rows = rows.filter((d) => (d.name + ' ' + (d.nameEn || '') + ' ' + (d.summary || '') + ' ' + (d.history || '') + ' ' + d.tags.join(' ')).toLowerCase().includes(q));
  }
  if (mood) {
    rows.sort((a, b) => (b.moods.includes(mood) ? 1 : 0) - (a.moods.includes(mood) ? 1 : 0));
  }
  const limit = req.query.limit ? Math.min(parseInt(req.query.limit, 10) || 50, 50) : rows.length;
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

app.get('/api/drinks/:id', (req, res) => {
  const r = db.prepare('SELECT * FROM drinks WHERE id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ error: '未找到该酒品' });
  res.json(parseDrink(r));
});

// ---------------- 社区 ----------------
app.get('/api/posts', optionalAuth(db), (req, res) => {
  const rows = db.prepare('SELECT p.*, u.username, (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count, (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count FROM posts p JOIN users u ON u.id = p.user_id').all();
  const meId = req.user ? req.user.id : null;
  const posts = rows.map((r) => parsePost(r, meId));
  if (req.query.sort === 'hot') posts.sort((a, b) => (b.likes_count + b.comments_count * 2) - (a.likes_count + a.comments_count * 2));
  else posts.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  res.json(posts);
});

app.post('/api/posts', requireAuth(db), (req, res) => {
  const { title, ingredients, steps, image } = req.body || {};
  const decTitle = decryptText(title);
  if (typeof decTitle !== 'string' || decTitle.trim().length === 0 || decTitle.length > 100)
    return res.status(400).json({ error: '标题不能为空且不超过 100 字' });
  const ings = Array.isArray(ingredients) ? ingredients.map((x) => decryptText(String(x))) : [];
  const stps = Array.isArray(steps) ? steps.map((x) => decryptText(String(x))) : [];
  if (stps.length === 0) return res.status(400).json({ error: '至少写一个步骤' });
  const info = db.prepare('INSERT INTO posts (user_id, title, ingredients, steps, image, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.user.id, decTitle.trim(), JSON.stringify(ings), JSON.stringify(stps), image || null, beijingNow());
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

app.get('/api/posts/:id', optionalAuth(db), (req, res) => {
  const r = db.prepare('SELECT p.*, u.username, (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count, (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ error: '帖子不存在' });
  const comments = db.prepare('SELECT c.id, c.content, c.created_at, u.username FROM comments c JOIN users u ON u.id = c.user_id WHERE c.post_id = ? ORDER BY c.created_at').all(r.id);
  res.json({ post: parsePost(r, req.user ? req.user.id : null), comments });
});

app.post('/api/posts/:id/like', requireAuth(db), (req, res) => {
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  const existing = db.prepare('SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?').get(post.id, req.user.id);
  if (existing) db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').run(post.id, req.user.id);
  else db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(post.id, req.user.id);
  const count = db.prepare('SELECT COUNT(*) AS c FROM likes WHERE post_id = ?').get(post.id).c;
  res.json({ liked: !existing, likes_count: count });
});

app.post('/api/posts/:id/comments', requireAuth(db), (req, res) => {
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  const content = decryptText(((req.body || {}).content || '').trim());
  if (!content || content.length > 500) return res.status(400).json({ error: '评论内容 1-500 字' });
  const now = beijingNow();
  const info = db.prepare('INSERT INTO comments (post_id, user_id, content, created_at) VALUES (?, ?, ?, ?)').run(post.id, req.user.id, content, now);
  res.status(201).json({ id: Number(info.lastInsertRowid), username: req.user.username, content, created_at: now });
});

app.delete('/api/posts/:id', requireAuth(db), (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  if (post.user_id !== req.user.id) return res.status(403).json({ error: '只能删除自己的帖子' });
  db.prepare('DELETE FROM comments WHERE post_id = ?').run(post.id);
  db.prepare('DELETE FROM likes WHERE post_id = ?').run(post.id);
  db.prepare('DELETE FROM posts WHERE id = ?').run(post.id);
  res.json({ ok: true });
});

app.delete('/api/comments/:id', requireAuth(db), (req, res) => {
  const c = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: '评论不存在' });
  if (c.user_id !== req.user.id) return res.status(403).json({ error: '只能删除自己的评论' });
  db.prepare('DELETE FROM comments WHERE id = ?').run(c.id);
  res.json({ ok: true });
});

// 404 兜底
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

app.listen(PORT, () => {
  console.log('Drinker API listening on http://localhost:' + PORT);
});

module.exports = app;