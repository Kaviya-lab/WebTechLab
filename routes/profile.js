const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { logAction } = require('../middleware/logger');

const router = express.Router();
router.use(authenticate); // any logged-in role can manage their own profile

// GET /api/profile
router.get('/', async (req, res, next) => {
  try {
    const [users] = await db.query(
      'SELECT user_id, name, email, mobile, role, status, created_at FROM users WHERE user_id = ?',
      [req.user.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const [addr] = await db.query(
      'SELECT address_id, address_line, city, state, pincode FROM addresses WHERE user_id = ? ORDER BY address_id LIMIT 1',
      [req.user.id]
    );
    res.json({ success: true, user: users[0], address: addr[0] || null });
  } catch (err) {
    next(err);
  }
});

// PUT /api/profile   { name, mobile, address?: { address_line, city, state, pincode } }
router.put('/', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const mobile = String(req.body.mobile || '').trim();
    const address = req.body.address;

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({ success: false, message: 'Name must be 2 to 100 characters' });
    }
    if (mobile && !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ success: false, message: 'Mobile must be 10 digits' });
    }

    let addr = null;
    if (address && typeof address === 'object') {
      addr = {
        address_line: String(address.address_line || '').trim(),
        city: String(address.city || '').trim(),
        state: String(address.state || '').trim(),
        pincode: String(address.pincode || '').trim()
      };
      if (addr.address_line.length < 3 || addr.address_line.length > 255) {
        return res.status(400).json({ success: false, message: 'Address must be 3 to 255 characters' });
      }
      if (!addr.city || addr.city.length > 100 || !addr.state || addr.state.length > 100) {
        return res.status(400).json({ success: false, message: 'City and state are required' });
      }
      if (!/^\d{6}$/.test(addr.pincode)) {
        return res.status(400).json({ success: false, message: 'Pincode must be 6 digits' });
      }
    }

    await db.query('UPDATE users SET name = ?, mobile = ? WHERE user_id = ?', [name, mobile || null, req.user.id]);

    if (addr) {
      const [existing] = await db.query('SELECT address_id FROM addresses WHERE user_id = ? ORDER BY address_id LIMIT 1', [req.user.id]);
      if (existing.length > 0) {
        await db.query(
          'UPDATE addresses SET address_line = ?, city = ?, state = ?, pincode = ? WHERE address_id = ?',
          [addr.address_line, addr.city, addr.state, addr.pincode, existing[0].address_id]
        );
      } else {
        await db.query(
          'INSERT INTO addresses (user_id, address_line, city, state, pincode) VALUES (?, ?, ?, ?, ?)',
          [req.user.id, addr.address_line, addr.city, addr.state, addr.pincode]
        );
      }
    }

    await logAction(req.user.id, 'PROFILE_UPDATE', 'Profile updated', req.ip);
    res.json({ success: true, message: 'Profile updated', name });
  } catch (err) {
    next(err);
  }
});

// PUT /api/profile/password   { old_password, new_password }
// Wrong old password returns 400 (not 401), because the frontend logs out on 401.
router.put('/password', async (req, res, next) => {
  try {
    const oldPw = String(req.body.old_password || '');
    const newPw = String(req.body.new_password || '');
    if (!oldPw || !newPw) {
      return res.status(400).json({ success: false, message: 'Old and new password are required' });
    }
    if (newPw.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }
    if (newPw === oldPw) {
      return res.status(400).json({ success: false, message: 'New password must be different from the old one' });
    }
    const [rows] = await db.query('SELECT password FROM users WHERE user_id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!(await bcrypt.compare(oldPw, rows[0].password))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    const hashed = await bcrypt.hash(newPw, 10);
    await db.query('UPDATE users SET password = ? WHERE user_id = ?', [hashed, req.user.id]);
    await logAction(req.user.id, 'PASSWORD_CHANGE', 'Password changed', req.ip);
    res.json({ success: true, message: 'Password changed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
