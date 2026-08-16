import CryptoJS from 'crypto-js';

const SECRET = 'drinker-secret-2026-default';

function key(): any {
  return CryptoJS.enc.Utf8.parse((SECRET + 'K').padEnd(32, '0').slice(0, 32));
}
function iv(): any {
  return CryptoJS.enc.Utf8.parse((SECRET + 'I').padEnd(16, '0').slice(0, 16));
}

export function encryptText(text: string): string {
  if (!text) return text;
  return CryptoJS.AES.encrypt(text, key(), { iv: iv() }).toString();
}

export function encryptList(arr: string[]): string[] {
  return arr.map(encryptText);
}
