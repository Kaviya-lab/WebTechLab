const express = require('express');
const db = require('../config/db');
const { authenticate, allowRoles } = require('../middleware/auth');
const { logAction } = require('../middleware/logger');
const { recalculateOrderStatus } = require('../utils/orderStatus');

const router = express.Router();
const customerOnly = [authenticate, allowRoles('customer')];

// POST /api/orders  { shipping_address }   (checkout, all-or-nothing transaction)
router.post('/', customerOnly, async (req, res, next) => {
  const address = typeof req.body.shipping_address === 'string' ? req.body.shipping_address.trim() : '';
  if (address.length < 5 || address.length > 500) {
    return res.status(400).json({ success: false, message: 'Shipping address must be 5 to 500 characters' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Cart items, locking the product rows so stock cannot change under us
    const [items] = await conn.query(
      `SELECT ci.cart_item_id, ci.product_id, ci.quantity,
              p.product_name, p.price, p.stock_quantity, p.seller_id, p.status
       FROM cart c
       JOIN cart_items ci ON ci.cart_id = c.cart_id
       JOIN products p ON p.product_id = ci.product_id
       WHERE c.customer_id = ?
       FOR UPDATE`,
      [req.user.id]
    );
    if (items.length === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Your cart is empty' });
    }

    // 2. Re-check stock and availability
    for (const i of items) {
      if (i.status !== 'active') {
        await conn.rollback();
        return res.status(400).json({ success: false, message: `"${i.product_name}" is no longer available` });
      }
      if (i.quantity > i.stock_quantity) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: `Only ${i.stock_quantity} of "${i.product_name}" left in stock` });
      }
    }

    const lines = items.map((i) => ({ ...i, subtotal: Math.round(Number(i.price) * i.quantity * 100) / 100 }));
    const total = Math.round(lines.reduce((s, l) => s + l.subtotal, 0) * 100) / 100;

    // 3. Order
    const [orderResult] = await conn.query(
      'INSERT INTO orders (customer_id, total_amount, shipping_address) VALUES (?, ?, ?)',
      [req.user.id, total, address]
    );
    const orderId = orderResult.insertId;

    // 4 + 5. Order items (item_status defaults to 'pending') and stock reduction
    for (const l of lines) {
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, seller_id, quantity, price, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, l.product_id, l.seller_id, l.quantity, l.price, l.subtotal]
      );
      await conn.query('UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ?', [l.quantity, l.product_id]);
    }

    // 6. Empty the cart
    await conn.query('DELETE FROM cart_items WHERE cart_item_id IN (?)', [items.map((i) => i.cart_item_id)]);

    await conn.commit();
    await logAction(req.user.id, 'ORDER_PLACE', `Order ${orderId} placed, total ${total}`, req.ip);
    res.status(201).json({ success: true, message: 'Order placed', order_id: orderId, total_amount: total });
  } catch (err) {
    await conn.rollback().catch(() => {});
    next(err);
  } finally {
    conn.release();
  }
});

// GET /api/orders/mine  (each order with every item and its own status)
router.get('/mine', customerOnly, async (req, res, next) => {
  try {
    const [orders] = await db.query(
      `SELECT order_id, total_amount, shipping_address, order_status, payment_status, order_date
       FROM orders WHERE customer_id = ? ORDER BY order_date DESC, order_id DESC`,
      [req.user.id]
    );
    if (orders.length === 0) return res.json({ success: true, orders: [] });

    const [items] = await db.query(
      `SELECT oi.order_id, oi.order_item_id, oi.product_id, p.product_name, p.image,
              oi.seller_id, u.name AS seller_name, oi.quantity, oi.price, oi.subtotal, oi.item_status
       FROM order_items oi
       JOIN products p ON p.product_id = oi.product_id
       JOIN users u ON u.user_id = oi.seller_id
       WHERE oi.order_id IN (?)
       ORDER BY oi.order_id, oi.order_item_id`,
      [orders.map((o) => o.order_id)]
    );
    orders.forEach((o) => { o.items = items.filter((i) => i.order_id === o.order_id); });
    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
});

// PUT /api/orders/:id/cancel  (only while no item is shipped or delivered)
router.put('/:id/cancel', customerOnly, async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [orders] = await conn.query(
      'SELECT order_id FROM orders WHERE order_id = ? AND customer_id = ? FOR UPDATE',
      [req.params.id, req.user.id]
    );
    if (orders.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const [items] = await conn.query(
      'SELECT order_item_id, product_id, quantity, item_status FROM order_items WHERE order_id = ? FOR UPDATE',
      [req.params.id]
    );
    if (items.some((i) => ['shipped', 'delivered'].includes(i.item_status))) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Cannot cancel: an item has already shipped' });
    }
    const toCancel = items.filter((i) => i.item_status !== 'cancelled');
    if (toCancel.length === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Order is already cancelled' });
    }

    // Put stock back only for items that were not already cancelled
    for (const i of toCancel) {
      await conn.query('UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?', [i.quantity, i.product_id]);
      await conn.query("UPDATE order_items SET item_status = 'cancelled' WHERE order_item_id = ?", [i.order_item_id]);
    }
    await recalculateOrderStatus(conn, req.params.id);

    await conn.commit();
    await logAction(req.user.id, 'ORDER_CANCEL', `Order ${req.params.id} cancelled by customer`, req.ip);
    res.json({ success: true, message: 'Order cancelled' });
  } catch (err) {
    await conn.rollback().catch(() => {});
    next(err);
  } finally {
    conn.release();
  }
});

module.exports = router;
