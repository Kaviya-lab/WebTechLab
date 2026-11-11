const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { logAction } = require('../middleware/logger');
const router = express.Router();

// Every permission an admin can be given (the super admin has all of them)
const ALL_PERMISSIONS = [
  'manage_customers', 'manage_sellers', 'manage_products', 'manage_categories',
  'manage_orders', 'view_reports', 'view_logs'
];

// POST /api/auth/register  (customer and seller only)
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, mobile, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'All required fields must be filled' });
    }
    if (!['customer', 'seller'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be customer or seller' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    if (mobile && !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ success: false, message: 'Mobile must be 10 digits' });
    }

    const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const status = role === 'seller' ? 'pending' : 'active';

    const [result] = await db.query(
      'INSERT INTO users (name, email, password, mobile, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashed, mobile || null, role, status]
    );

    // Every customer gets a cart
    if (role === 'customer') {
      await db.query('INSERT INTO cart (customer_id) VALUES (?)', [result.insertId]);
    }

    await logAction(result.insertId, 'REGISTER', `New ${role} registered: ${email}`, req.ip);

    res.status(201).json({
      success: true,
      message: role === 'seller'
        ? 'Registered. Wait for admin approval before logging in.'
        : 'Registered successfully. You can log in now.'
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      await logAction(user ? user.user_id : null, 'LOGIN_FAILED', `Failed login for ${email}`, req.ip);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const statusMessages = {
      blocked: 'Your account has been blocked',
      pending: 'Your account is waiting for admin approval',
      rejected: 'Your registration was rejected',
      inactive: 'Your account is deactivated'
    };
    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: statusMessages[user.status] });
    }

    const token = jwt.sign(
      { id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    await logAction(user.user_id, 'LOGIN', `${user.role} logged in`, req.ip);

    res.json({
      success: true,
      token,
      role: user.role,
      name: user.name
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT user_id, name, email, mobile, role, status, created_at FROM users WHERE user_id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
        const user = rows[0];

    // Permissions the frontend uses to show or hide admin menu items
    let permissions = [];
    if (user.role === 'superadmin') {
      permissions = ALL_PERMISSIONS;
    } else if (user.role === 'admin') {
      const [perms] = await db.query(
        'SELECT permission_name FROM admin_permissions WHERE admin_id = ? ORDER BY permission_name',
        [user.user_id]
      );
      permissions = perms.map((p) => p.permission_name);
    }

    res.json({ success: true, user: { ...user, permissions } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
