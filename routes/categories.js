const express = require('express');
const db = require('../config/db');
const { authenticate, allowRoles } = require('../middleware/auth');

const router = express.Router();
const adminOnly = [authenticate, allowRoles('admin', 'superadmin')];

// GET /api/categories (public, active only)
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT category_id, category_name, description FROM categories WHERE status = 'active' ORDER BY category_name"
    );
    res.json({ success: true, categories: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/categories (admin, superadmin)
router.post('/', adminOnly, async (req, res, next) => {
  try {
    const { category_name, description } = req.body;
    if (!category_name || !category_name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }
    const [dup] = await db.query('SELECT category_id FROM categories WHERE category_name = ?', [category_name.trim()]);
    if (dup.length > 0) {
      return res.status(409).json({ success: false, message: 'Category already exists' });
    }
    const [result] = await db.query(
      'INSERT INTO categories (category_name, description) VALUES (?, ?)',
      [category_name.trim(), description || null]
    );
    res.status(201).json({ success: true, message: 'Category added', category_id: result.insertId });
  } catch (err) {
    next(err);
  }
});

// PUT /api/categories/:id (admin, superadmin)
router.put('/:id', adminOnly, async (req, res, next) => {
  try {
    const { category_name, description, status } = req.body;
    if (!category_name || !category_name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }
    if (status && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be active or inactive' });
    }
    const [result] = await db.query(
      'UPDATE categories SET category_name = ?, description = ?, status = COALESCE(?, status) WHERE category_id = ?',
      [category_name.trim(), description || null, status || null, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, message: 'Category updated' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Category name already used' });
    }
    next(err);
  }
});

// DELETE /api/categories/:id (admin, superadmin)
// If products use it, deactivate instead of deleting (foreign key)
router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const [used] = await db.query('SELECT product_id FROM products WHERE category_id = ? LIMIT 1', [req.params.id]);
    if (used.length > 0) {
      await db.query("UPDATE categories SET status = 'inactive' WHERE category_id = ?", [req.params.id]);
      return res.json({ success: true, message: 'Category has products, so it was deactivated instead' });
    }
    const [result] = await db.query('DELETE FROM categories WHERE category_id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
