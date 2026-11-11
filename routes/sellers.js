const express = require('express');
const db = require('../config/db');
const { authenticate, allowRoles } = require('../middleware/auth');
const { requirePermission } = require('../middleware/role');
const { logAction } = require('../middleware/logger');

const router = express.Router();

router.use(authenticate, allowRoles('admin', 'superadmin'), requirePermission('manage_sellers'));

const STATUSES = ['active', 'blocked', 'pending', 'rejected', 'inactive'];

// GET /api/sellers?status=&search=
router.get('/', async (req, res, next) => {
  try {
    let sql = "SELECT user_id, name, email, mobile, status, created_at FROM users WHERE role = 'seller'";
    const params = [];

    const status = String(req.query.status || '').trim();
    if (status) {
      if (!STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status filter' });
      }
      sql += ' AND status = ?';
      params.push(status);
    }
    const search = String(req.query.search || '').trim();
    if (search) {
      sql += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY created_at DESC';

    const [sellers] = await db.query(sql, params);
    res.json({ success: true, sellers });
  } catch (err) {
    next(err);
  }
});

// action -> required current status, new status, log label
const TRANSITIONS = {
  approve: { from: 'pending', to: 'active', log: 'SELLER_APPROVE', text: 'Approved' },
  reject: { from: 'pending', to: 'rejected', log: 'SELLER_REJECT', text: 'Rejected' },
  block: { from: 'active', to: 'blocked', log: 'SELLER_BLOCK', text: 'Blocked' },
  unblock: { from: 'blocked', to: 'active', log: 'SELLER_UNBLOCK', text: 'Unblocked' }
};

Object.entries(TRANSITIONS).forEach(([name, t]) => {
  // PATCH /api/sellers/:id/approve | reject | block | unblock
  router.patch(`/:id/${name}`, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id) {
        return res.status(400).json({ success: false, message: 'Invalid seller id' });
      }
      const [rows] = await db.query(
        "SELECT user_id, status FROM users WHERE user_id = ? AND role = 'seller'",
        [id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Seller not found' });
      }
      if (rows[0].status !== t.from) {
        return res.status(400).json({
          success: false,
          message: `Cannot ${name} this seller: status must be ${t.from} (current status: ${rows[0].status})`
        });
      }
      await db.query('UPDATE users SET status = ? WHERE user_id = ?', [t.to, id]);
      await logAction(req.user.id, t.log, `${t.text} seller ${id}`, req.ip);
      res.json({ success: true, message: `Seller ${t.text.toLowerCase()}`, status: t.to });
    } catch (err) {
      next(err);
    }
  });
});

module.exports = router;
