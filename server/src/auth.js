const crypto = require('crypto');

// 密码散列（scrypt，纯 Node，无原生依赖）
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const test = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(test, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

// 必选鉴权中间件
function requireAuth(db) {
  return (req, res, next) => {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const session = token
      ? db.prepare('SELECT s.token, s.user_id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?').get(token)
      : undefined;
    if (!session) return res.status(401).json({ error: '未登录或登录已过期' });
    req.user = { id: session.user_id, username: session.username };
    req.token = token;
    next();
  };
}

// 可选鉴权中间件（社区列表未登录时也能看）
function optionalAuth(db) {
  return (req, res, next) => {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const session = token
      ? db.prepare('SELECT s.token, s.user_id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?').get(token)
      : undefined;
    if (session) {
      req.user = { id: session.user_id, username: session.username };
      req.token = token;
    }
    next();
  };
}

module.exports = { hashPassword, verifyPassword, newToken, requireAuth, optionalAuth };
