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

async function translateDrinkDetails(drink) {
  const source = {
    name: drink.nameEn || drink.name,
    category: drink.category || '',
    summary: drink.summary || '',
    ingredients: drink.ingredients || [],
    steps: drink.steps || [],
  };
  const fallback = {
    ...drink,
    name: await enToZh(source.name),
    category: '鸡尾酒',
    summary: '一款具有代表性的经典调酒，可在配方与做法中了解它的风味结构。',
    history: `${source.name} 是流传于国际酒吧文化中的鸡尾酒。不同地区和酒吧可能采用略有差异的配方，以下内容以常见版本为准。`,
  };
  if (!key()) return fallback;
  const cacheKey = 'drink:' + source.name;
  if (cache.has(cacheKey)) return { ...drink, ...cache.get(cacheKey) };
  try {
    const prompt = [
      '请将下面的鸡尾酒资料整理为简体中文。',
      '返回严格 JSON，字段必须是 name、category、summary、history、ingredients、steps。',
      'history 用 80-150 字介绍有可靠依据的历史渊源；来源有争议时明确写“说法之一”或“普遍认为”，不要虚构精确人物和年份。',
      'ingredients 保持 [{name,amount}] 结构并翻译原料名，steps 保持字符串数组并翻译做法。',
      JSON.stringify(source),
    ].join('\n');
    let raw = String(await chat([{ role: 'user', content: prompt }])).trim();
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const localized = JSON.parse(raw);
    const result = {
      name: localized.name || fallback.name,
      category: localized.category || fallback.category,
      summary: localized.summary || fallback.summary,
      history: localized.history || fallback.history,
      ingredients: Array.isArray(localized.ingredients) ? localized.ingredients : drink.ingredients,
      steps: Array.isArray(localized.steps) ? localized.steps : drink.steps,
    };
    cache.set(cacheKey, result);
    return { ...drink, ...result };
  } catch (e) {
    return fallback;
  }
}

module.exports = { zhToEn, enToZh, enToZhBatch, translateDrinkDetails, hasChinese };
