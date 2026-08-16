const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DRINKER_DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = process.env.DRINKER_DB_PATH || path.join(DATA_DIR, 'drinker.db');

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    salt TEXT NOT NULL,
    hash TEXT NOT NULL,
    avatar TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS moods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    mood TEXT,
    note TEXT,
    UNIQUE(user_id, date)
  );
  CREATE TABLE IF NOT EXISTS drinks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT,
    category TEXT,
    moods TEXT NOT NULL DEFAULT '[]',
    image TEXT,
    summary TEXT,
    history TEXT,
    ingredients TEXT NOT NULL DEFAULT '[]',
    steps TEXT NOT NULL DEFAULT '[]',
    videos TEXT NOT NULL DEFAULT '[]',
    tags TEXT NOT NULL DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    ingredients TEXT NOT NULL DEFAULT '[]',
    steps TEXT NOT NULL DEFAULT '[]',
    image TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS likes (
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    PRIMARY KEY (post_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    drink_id TEXT NOT NULL,
    name TEXT NOT NULL,
    name_en TEXT,
    image TEXT,
    data TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, drink_id)
  );
`;

function normalizeArgs(args) {
  return args.map((value) => value === undefined ? null : value);
}

function createDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const remoteUrl = process.env.TURSO_DATABASE_URL;
  const client = createClient({
    url: remoteUrl || 'file:' + DB_PATH.replace(/\\/g, '/'),
    authToken: remoteUrl ? process.env.TURSO_AUTH_TOKEN : undefined,
  });

  const db = {
    client,
    isCloud: Boolean(remoteUrl),
    prepare(sql) {
      return {
        async get(...args) {
          await db.ready;
          const result = await client.execute({ sql, args: normalizeArgs(args) });
          return result.rows[0];
        },
        async all(...args) {
          await db.ready;
          const result = await client.execute({ sql, args: normalizeArgs(args) });
          return Array.from(result.rows);
        },
        async run(...args) {
          await db.ready;
          const result = await client.execute({ sql, args: normalizeArgs(args) });
          return { changes: result.rowsAffected, lastInsertRowid: result.lastInsertRowid };
        },
      };
    },
    async exec(sql) {
      await db.ready;
      return client.executeMultiple(sql);
    },
  };

  db.ready = (async () => {
    await client.executeMultiple(SCHEMA_SQL);
    await seedDrinks(client);
    console.log('[db] connected to ' + (db.isCloud ? 'Turso cloud' : DB_PATH));
  })();
  return db;
}

async function seedDrinks(client) {
  const file = path.join(DATA_DIR, 'drinks.json');
  if (!fs.existsSync(file)) return;
  const drinks = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(drinks) || drinks.length === 0) return;
  const statements = drinks.map((d) => ({
    sql: `INSERT OR REPLACE INTO drinks
      (id, name, name_en, category, moods, image, summary, history, ingredients, steps, videos, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [d.id, d.name, d.nameEn || null, d.category || '经典', JSON.stringify(d.moods || []),
      d.image || '', d.summary || '', d.history || '', JSON.stringify(d.ingredients || []),
      JSON.stringify(d.steps || []), JSON.stringify(d.videos || []), JSON.stringify(d.tags || [])],
  }));
  await client.batch(statements, 'write');
  console.log('[db] synced ' + drinks.length + ' drinks');
}

module.exports = { createDb, DB_PATH, SCHEMA_SQL };
