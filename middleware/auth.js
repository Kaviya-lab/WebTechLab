const jwt = require('jsonwebtoken'); //Middleware auth
const db = require('../config/db');

// Checks the JWT and puts user info on req.user
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not logged in' });
  }
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  try {
    const [users] = await db.query(
      'SELECT user_id, role, status FROM users WHERE user_id = ?',
      [decoded.id]
    );
    const user = users[0];
    if (!user || user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Account is not active' });
    }
    if (user.role !== decoded.role) {
      return res.status(401).json({ success: false, message: 'Account permissions have changed. Please log in again.' });
    }
    req.user = { id: user.user_id, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

// Usage: allowRoles('seller', 'admin', 'superadmin')
function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
  };
}

module.exports = { authenticate, allowRoles };
