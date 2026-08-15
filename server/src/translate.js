const https = require('https');
const { EN2ZH, ZH2EN } = require('./drinks-cn');

const MODEL = process.env.TRANSLATE_MODEL || 'qwen-plus';
const cache = new Map();

function key() { return process.env.DASHSCOPE_API_KEY || ''; }

function chat(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: MODEL, messages });
    const req = https.request('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key(), 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let d = '';
      res.on('data', (c) => d += c);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(d).choices[0].message.content); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

function hasChinese(s) { return /[\u4e00-\u9fa5]/.test(s || ''); }

// 中文查询 → 英文（用于 TheCocktailDB 搜索）
async function zhToEn(text) {
  if (!hasChinese(text)) return text;
  if (ZH2EN[text]) return ZH2EN[text]; // 本地词典优先（不耗额度）
  const k = 'ze:' + text;
  if (cache.has(k)) return cache.get(k);
  try {
    const out = (await chat([{ role: 'user', content: '把"' + text + '"翻译成英文鸡尾酒名或原料关键词，只输出英文，不要解释。' }])).trim();
    cache.set(k, out);
    return out;
  } catch (e) { return text; }
}

// 英文名 → 中文名
async function enToZh(text) {
  if (!text) return text;
  const low = text.toLowerCase();
  if (EN2ZH[low]) return EN2ZH[low]; // 本地词典优先（不耗额度）
  const k = 'ez:' + text;
  if (cache.has(k)) return cache.get(k);
  try {
    const out = (await chat([{ role: 'user', content: '把"' + text + '"翻译成中文鸡尾酒名，只输出中文，不要解释。' }])).trim();
    cache.set(k, out);
    return out;
  } catch (e) { return text; }
}

// 批量英文名 → 中文名（带并发限制 + 缓存）
async function enToZhBatch(names) {
  const result = [];
  const todo = [];
  for (let i = 0; i < names.length; i++) {
    const n = names[i];
    if (cache.has('ez:' + n)) result[i] = cache.get('ez:' + n);
    else todo.push({ i, n });
  }
  const CONC = 5;
  for (let k = 0; k < todo.length; k += CONC) {
    const batch = todo.slice(k, k + CONC);
    await Promise.all(batch.map(async (t) => { result[t.i] = await enToZh(t.n); }));
  }
  return result;
}

module.exports = { zhToEn, enToZh, enToZhBatch, hasChinese };
