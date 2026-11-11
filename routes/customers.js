const express = require('express');
const db = require('../config/db');
const { authenticate, allowRoles } = require('../middleware/auth');
const { requirePermission } = require('../middleware/role');
const { logAction } = require('../middleware/logger');

const router = express.Router();

router.use(authenticate, allowRoles('admin', 'superadmin'), requirePermission('manage_customers'));

// GET /api/customers?search=
router.get('/', async (req, res, next) => {
  try {
    let sql = "SELECT user_id, name, email, mobile, status, created_at FROM users WHERE role = 'customer'";
    const params = [];
    const search = String(req.query.search || '').trim();
    if (search) {
      sql += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY created_at DESC';
    const [customers] = await db.query(sql, params);
    res.json({ success: true, customers });
  } catch (err) {
    next(err);
  }
});

// Shared by block and unblock
async function changeStatus(req, res, next, { to, action, label, allowed, wrongMessage }) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) {
      return res.status(400).json({ success: false, message: 'Invalid customer id' });
    }
    const [rows] = await db.query(
      "SELECT user_id, status FROM users WHERE user_id = ? AND role = 'customer'",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    if (!allowed(rows[0].status)) {
      return res.status(400).json({ success: false, message: wrongMessage(rows[0].status) });
    }
    await db.query('UPDATE users SET status = ? WHERE user_id = ?', [to, id]);
    await logAction(req.user.id, action, `${label} customer ${id}`, req.ip);
    res.json({ success: true, message: `Customer ${label.toLowerCase()}`, status: to });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/customers/:id/block
router.patch('/:id/block', (req, res, next) =>
  changeStatus(req, res, next, {
    to: 'blocked',
    action: 'USER_BLOCK',
    label: 'Blocked',
    allowed: s => s !== 'blocked',
    wrongMessage: () => 'Customer is already blocked'
  })
);

// PATCH /api/customers/:id/unblock
router.patch('/:id/unblock', (req, res, next) =>
  changeStatus(req, res, next, {
    to: 'active',
    action: 'USER_UNBLOCK',
    label: 'Unblocked',
    allowed: s => s === 'blocked',
    wrongMessage: s => `Only blocked customers can be unblocked (current status: ${s})`
  })
);

module.exports = router;
