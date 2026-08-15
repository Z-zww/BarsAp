// 北京时间（UTC+8）工具，保证无论服务器/设备时区如何都按北京时间
const BJ_OFFSET = 8 * 60 * 60 * 1000;

function beijingDate(d = new Date()) {
  const bj = new Date(d.getTime() + BJ_OFFSET);
  const p = (n) => String(n).padStart(2, '0');
  return bj.getUTCFullYear() + '-' + p(bj.getUTCMonth() + 1) + '-' + p(bj.getUTCDate());
}

function beijingNow(d = new Date()) {
  const bj = new Date(d.getTime() + BJ_OFFSET);
  const p = (n) => String(n).padStart(2, '0');
  return bj.getUTCFullYear() + '-' + p(bj.getUTCMonth() + 1) + '-' + p(bj.getUTCDate()) + ' ' + p(bj.getUTCHours()) + ':' + p(bj.getUTCMinutes()) + ':' + p(bj.getUTCSeconds());
}

module.exports = { beijingDate, beijingNow };
