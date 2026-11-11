const express = require('express');
const db = require('../config/db');
const { authenticate, allowRoles } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, allowRoles('customer'));

// Every customer has one cart row; create it if it is missing
async function getCartId(customerId) {
  const [rows] = await db.query('SELECT cart_id FROM cart WHERE customer_id = ?', [customerId]);
  if (rows.length > 0) return rows[0].cart_id;
  const [result] = await db.query('INSERT INTO cart (customer_id) VALUES (?)', [customerId]);
  return result.insertId;
}

function parseQty(value) {
  const q = Number(value);
  return Number.isInteger(q) && q > 0 ? q : null;
}

// GET /api/cart
router.get('/', async (req, res, next) => {
  try {
    const cartId = await getCartId(req.user.id);
    const [items] = await db.query(
      `SELECT ci.cart_item_id, ci.product_id, ci.quantity, p.product_name, p.image,
              p.price, p.stock_quantity, u.name AS seller_name,
              (p.price * ci.quantity) AS subtotal
       FROM cart_items ci
       JOIN products p ON p.product_id = ci.product_id
       JOIN users u ON u.user_id = p.seller_id
       WHERE ci.cart_id = ?
       ORDER BY ci.cart_item_id`,
      [cartId]
    );
    const total = items.reduce((sum, i) => sum + Number(i.subtotal), 0);
    res.json({ success: true, items, total: Math.round(total * 100) / 100, count: items.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/cart  { product_id, quantity }
router.post(['/', '/items'], async (req, res, next) => {
  try {
    const productId = Number(req.body.product_id);
    const qty = parseQty(req.body.quantity === undefined ? 1 : req.body.quantity);
    if (!Number.isInteger(productId) || productId <= 0 || !qty) {
      return res.status(400).json({ success: false, message: 'Valid product_id and quantity are required' });
    }

    const [products] = await db.query(
      `SELECT p.product_id, p.price, p.stock_quantity FROM products p
       JOIN users u ON u.user_id = p.seller_id
       JOIN categories c ON c.category_id = p.category_id
       WHERE p.product_id = ? AND p.status = 'active'
         AND u.status = 'active' AND c.status = 'active'`,
      [productId]
    );
    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not available' });
    }
    const product = products[0];

    const cartId = await getCartId(req.user.id);
    const [existing] = await db.query(
      'SELECT cart_item_id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?',
      [cartId, productId]
    );
    const newQty = (existing.length > 0 ? existing[0].quantity : 0) + qty;
    if (newQty > product.stock_quantity) {
      return res.status(400).json({ success: false, message: `Only ${product.stock_quantity} in stock` });
    }

    if (existing.length > 0) {
      await db.query('UPDATE cart_items SET quantity = ?, price = ? WHERE cart_item_id = ?', [newQty, product.price, existing[0].cart_item_id]);
    } else {
      await db.query('INSERT INTO cart_items (cart_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [cartId, productId, qty, product.price]);
    }
    res.status(201).json({ success: true, message: 'Added to cart' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/cart/:itemId  { quantity }
router.put('/:itemId', async (req, res, next) => {
  try {
    const qty = parseQty(req.body.quantity);
    if (!qty) {
      return res.status(400).json({ success: false, message: 'Quantity must be a whole number of at least 1' });
    }
    const [rows] = await db.query(
      `SELECT ci.cart_item_id, p.stock_quantity, p.price
       FROM cart_items ci
       JOIN cart c ON c.cart_id = ci.cart_id
       JOIN products p ON p.product_id = ci.product_id
       WHERE ci.cart_item_id = ? AND c.customer_id = ?`,
      [req.params.itemId, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }
    if (qty > rows[0].stock_quantity) {
      return res.status(400).json({ success: false, message: `Only ${rows[0].stock_quantity} in stock` });
    }
    await db.query('UPDATE cart_items SET quantity = ?, price = ? WHERE cart_item_id = ?', [qty, rows[0].price, rows[0].cart_item_id]);
    res.json({ success: true, message: 'Quantity updated' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cart/:itemId
router.delete('/:itemId', async (req, res, next) => {
  try {
    const [result] = await db.query(
      `DELETE ci FROM cart_items ci
       JOIN cart c ON c.cart_id = ci.cart_id
       WHERE ci.cart_item_id = ? AND c.customer_id = ?`,
      [req.params.itemId, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }
    res.json({ success: true, message: 'Item removed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
