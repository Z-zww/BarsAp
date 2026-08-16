const crypto = require('crypto');

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

function authMiddleware(db, required) {
  return async (req, res, next) => {
    try {
      const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const session = token
        ? await db.prepare('SELECT s.token, s.user_id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?').get(token)
        : undefined;
      if (!session && required) return res.status(401).json({ error: '未登录或登录已过期' });
      if (session) {
        req.user = { id: Number(session.user_id), username: session.username };
        req.token = token;
      }
      next();
    } catch (error) { next(error); }
  };
}

function requireAuth(db) { return authMiddleware(db, true); }
function optionalAuth(db) { return authMiddleware(db, false); }

module.exports = { hashPassword, verifyPassword, newToken, requireAuth, optionalAuth };
