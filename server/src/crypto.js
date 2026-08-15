const CryptoJS = require('crypto-js');

// 传输加密共享密钥（可用环境变量 DRINKER_SECRET 覆盖）
const KEY = process.env.DRINKER_SECRET || 'drinker-secret-2026-default';

// 解密客户端上传的内容；解密失败则原样返回（兼容未加密）
function decryptText(cipher) {
  if (typeof cipher !== 'string' || !cipher) return cipher;
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, KEY);
    const text = bytes.toString(CryptoJS.enc.Utf8);
    return text || cipher;
  } catch (e) {
    return cipher;
  }
}

module.exports = { decryptText, KEY };
