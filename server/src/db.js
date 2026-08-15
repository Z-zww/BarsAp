const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DRINKER_DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = process.env.DRINKER_DB_PATH || path.join(DATA_DIR, 'drinker.db');

function createDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      salt TEXT NOT NULL,
      hash TEXT NOT NULL,
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
      mood TEXT NOT NULL,
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
  `);

  seedDrinks(db);
  return db;
}

function seedDrinks(db) {
  const file = path.join(DATA_DIR, 'drinks.json');
  if (!fs.existsSync(file)) return;
  const drinks = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(drinks) || drinks.length === 0) return;
  const existing = db.prepare('SELECT COUNT(*) AS c FROM drinks').get().c;
  if (existing > 0) return; // 已入库，不重复 seed
  const ins = db.prepare(`
    INSERT OR IGNORE INTO drinks
      (id, name, name_en, category, moods, image, summary, history, ingredients, steps, videos, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const d of drinks) {
    ins.run(
      d.id,
      d.name,
      d.nameEn || null,
      d.category || '经典',
      JSON.stringify(d.moods || []),
      d.image || '',
      d.summary || '',
      d.history || '',
      JSON.stringify(d.ingredients || []),
      JSON.stringify(d.steps || []),
      JSON.stringify(d.videos || []),
      JSON.stringify(d.tags || []),
    );
  }
  console.log('[db] seeded ' + drinks.length + ' drinks');
}

module.exports = { createDb, DB_PATH };
