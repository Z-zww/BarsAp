const CryptoJS = require('crypto-js');

// 传输加密共享密钥（可用环境变量 DRINKER_SECRET 覆盖；与移动端保持一致）
const SECRET = process.env.DRINKER_SECRET || 'drinker-secret-2026-default';

function key() {
  return CryptoJS.enc.Utf8.parse((SECRET + 'K').padEnd(32, '0').slice(0, 32));
}
function iv() {
  return CryptoJS.enc.Utf8.parse((SECRET + 'I').padEnd(16, '0').slice(0, 16));
}

// 解密客户端上传的内容；解密失败则原样返回（兼容未加密）
function decryptText(cipher) {
  if (typeof cipher !== 'string' || !cipher) return cipher;
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, key(), { iv: iv() });
    const text = bytes.toString(CryptoJS.enc.Utf8);
    return text || cipher;
  } catch (e) {
    return cipher;
  }
}

module.exports = { decryptText };
