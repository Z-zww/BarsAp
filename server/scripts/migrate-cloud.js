require('dotenv').config();
const { DatabaseSync } = require('node:sqlite');
const { createClient } = require('@libsql/client');
const { DB_PATH, SCHEMA_SQL } = require('../src/db');

const TABLES = [
  { name: 'users', columns: ['id', 'username', 'salt', 'hash', 'avatar', 'created_at'] },
  { name: 'sessions', columns: ['token', 'user_id', 'created_at'] },
  { name: 'moods', columns: ['id', 'user_id', 'date', 'mood', 'note'] },
  { name: 'drinks', columns: ['id', 'name', 'name_en', 'category', 'moods', 'image', 'summary', 'history', 'ingredients', 'steps', 'videos', 'tags'] },
  { name: 'posts', columns: ['id', 'user_id', 'title', 'ingredients', 'steps', 'image', 'created_at'] },
  { name: 'likes', columns: ['post_id', 'user_id'] },
  { name: 'comments', columns: ['id', 'post_id', 'user_id', 'content', 'created_at'] },
  { name: 'favorites', columns: ['id', 'user_id', 'drink_id', 'name', 'name_en', 'image', 'data', 'created_at'] },
];

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error('缺少 TURSO_DATABASE_URL 或 TURSO_AUTH_TOKEN');
  if (!url.startsWith('libsql://')) throw new Error('TURSO_DATABASE_URL 必须以 libsql:// 开头');

  const local = new DatabaseSync(DB_PATH, { readOnly: true });
  const cloud = createClient({ url, authToken });
  await cloud.executeMultiple(SCHEMA_SQL);

  console.log('[migrate] source: ' + DB_PATH);
  for (const table of TABLES) {
    const rows = local.prepare(`SELECT ${table.columns.join(', ')} FROM ${table.name}`).all();
    const placeholders = table.columns.map(() => '?').join(', ');
    const statements = rows.map((row) => ({
      sql: `INSERT OR REPLACE INTO ${table.name} (${table.columns.join(', ')}) VALUES (${placeholders})`,
      args: table.columns.map((column) => row[column] === undefined ? null : row[column]),
    }));
    for (let i = 0; i < statements.length; i += 100) {
      await cloud.batch(statements.slice(i, i + 100), 'write');
    }
    const cloudCount = await cloud.execute(`SELECT COUNT(*) AS count FROM ${table.name}`);
    console.log(`[migrate] ${table.name}: local=${rows.length}, cloud=${cloudCount.rows[0].count}`);
  }

  local.close();
  cloud.close();
  console.log('[migrate] completed; local database was not modified');
}

main().catch((error) => {
  console.error('[migrate] failed:', error.message);
  process.exitCode = 1;
});
