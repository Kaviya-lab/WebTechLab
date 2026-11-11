const db = require('../config/db');

// Usage: requirePermission('manage_orders')
function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not logged in' });
      }
      if (req.user.role === 'superadmin') return next();
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      const [rows] = await db.query(
        'SELECT permission_id FROM admin_permissions WHERE admin_id = ? AND permission_name = ?',
        [req.user.id, permission]
      );
      if (rows.length === 0) {
        return res.status(403).json({ success: false, message: 'You do not have permission for this action' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requirePermission };
