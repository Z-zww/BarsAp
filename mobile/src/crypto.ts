import CryptoJS from 'crypto-js';

// 与服务端共享密钥（app.json 的 extra.secretKey 可覆盖；与服务端 DRINKER_SECRET 一致）
const KEY = 'drinker-secret-2026-default';

export function encryptText(text: string): string {
  if (!text) return text;
  return CryptoJS.AES.encrypt(text, KEY).toString();
}

export function encryptList(arr: string[]): string[] {
  return arr.map(encryptText);
}
