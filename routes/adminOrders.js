const express = require('express');
const db = require('../config/db');
const { authenticate, allowRoles } = require('../middleware/auth');
const { requirePermission } = require('../middleware/role');

const router = express.Router();

// Every route here is read-only and limited to admin / superadmin with manage_orders
router.use(authenticate, allowRoles('admin', 'superadmin'), requirePermission('manage_orders'));

const WAITING = "('pending','processing')";
const DISPATCHED = "('shipped','delivered')";

// One row per order with item counts. Used by the list, the filters and the summary.
const GROUPED_SQL = `
  SELECT o.order_id, o.order_status, o.payment_status, o.total_amount, o.order_date,
         u.name AS customer_name, u.email AS customer_email,
         COUNT(oi.order_item_id) AS total_items,
         SUM(oi.item_status = 'cancelled') AS cancelled_items,
         SUM(oi.item_status = 'delivered') AS delivered_items,
         SUM(oi.item_status IN ${DISPATCHED}) AS dispatched_items,
         SUM(oi.item_status IN ${WAITING}) AS waiting_items
  FROM orders o
  JOIN users u ON u.user_id = o.customer_id
  JOIN order_items oi ON oi.order_id = o.order_id
`;

// Turns the counts into labels the admin can read
function describeOrder(row, staleDays) {
  const total = Number(row.total_items);
  const cancelled = Number(row.cancelled_items);
  const dispatched = Number(row.dispatched_items);
  const delivered = Number(row.delivered_items);
  const waiting = Number(row.waiting_items);
  const active = total - cancelled;
  const ageDays = Math.floor((Date.now() - new Date(row.order_date).getTime()) / 86400000);

  let fulfilment;
  if (active === 0) fulfilment = 'all_cancelled';
  else if (delivered === active) fulfilment = 'all_delivered';
  else if (dispatched > 0 && waiting > 0) fulfilment = 'partially_fulfilled';
  else if (dispatched === 0) fulfilment = 'not_started';
  else fulfilment = 'all_dispatched';

  return {
    ...row,
    total_items: total,
    cancelled_items: cancelled,
    dispatched_items: dispatched,
    waiting_items: waiting,
    fulfilment,
    has_cancelled_and_active: cancelled > 0 && active > 0,
    age_days: ageDays,
    is_stale: waiting > 0 && ageDays >= staleDays
  };
}

// Loads the items (with product and seller) for a list of order ids
async function loadItems(orderIds) {
  if (orderIds.length === 0) return {};
  const [items] = await db.query(
    `SELECT oi.order_id, oi.order_item_id, oi.product_id, p.product_name,
            oi.quantity, oi.price, oi.subtotal,
            oi.seller_id, s.name AS seller_name, oi.item_status
     FROM order_items oi
     JOIN products p ON p.product_id = oi.product_id
     JOIN users s ON s.user_id = oi.seller_id
     WHERE oi.order_id IN (?)
     ORDER BY oi.order_id, oi.order_item_id`,
    [orderIds]
  );
  const byOrder = {};
  items.forEach(i => (byOrder[i.order_id] = byOrder[i.order_id] || []).push(i));
  return byOrder;
}

function readStaleDays(req) {
  const d = parseInt(req.query.staleDays, 10);
  return Number.isInteger(d) && d > 0 && d <= 365 ? d : 3;
}

// GET /api/admin/orders/summary  -> numbers for the dashboard cards
router.get('/summary', async (req, res, next) => {
  try {
    const staleDays = readStaleDays(req);
    const [rows] = await db.query(
      `SELECT COUNT(*) AS total_orders,
              COALESCE(SUM(dispatched_items > 0 AND waiting_items > 0), 0) AS partially_fulfilled,
              COALESCE(SUM(cancelled_items > 0 AND total_items > cancelled_items), 0) AS cancelled_and_active,
              COALESCE(SUM(waiting_items > 0 AND order_date < NOW() - INTERVAL ? DAY), 0) AS stale_orders
       FROM (${GROUPED_SQL} GROUP BY o.order_id) t`,
      [staleDays]
    );
    const r = rows[0];
    res.json({
      success: true,
      staleDays,
      summary: {
        total_orders: Number(r.total_orders),
        partially_fulfilled: Number(r.partially_fulfilled),
        cancelled_and_active: Number(r.cancelled_and_active),
        stale_orders: Number(r.stale_orders)
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders?filter=all|partial|cancelled_mixed|stale&staleDays=3&status=&search=&page=1
router.get('/', async (req, res, next) => {
  try {
    const staleDays = readStaleDays(req);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = 10;
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];
    if (req.query.status) {
      where.push('o.order_status = ?');
      params.push(req.query.status);
    }
    if (req.query.search) {
      where.push('(u.name LIKE ? OR u.email LIKE ? OR o.order_id = ?)');
      params.push(`%${req.query.search}%`, `%${req.query.search}%`, parseInt(req.query.search, 10) || 0);
    }

    const having = [];
    const havingParams = [];
    switch (req.query.filter) {
      case 'partial':
        having.push('dispatched_items > 0 AND waiting_items > 0');
        break;
      case 'cancelled_mixed':
        having.push('cancelled_items > 0 AND total_items > cancelled_items');
        break;
      case 'stale':
        having.push('waiting_items > 0 AND o.order_date < NOW() - INTERVAL ? DAY');
        havingParams.push(staleDays);
        break;
    }

    const grouped = `${GROUPED_SQL}
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      GROUP BY o.order_id
      ${having.length ? 'HAVING ' + having.join(' AND ') : ''}`;
    const allParams = [...params, ...havingParams];

    const [[countRow]] = await db.query(`SELECT COUNT(*) AS total FROM (${grouped}) t`, allParams);
    const [orders] = await db.query(
      `${grouped} ORDER BY o.order_date DESC LIMIT ? OFFSET ?`,
      [...allParams, limit, offset]
    );

    const itemsByOrder = await loadItems(orders.map(o => o.order_id));
    const result = orders.map(o => ({
      ...describeOrder(o, staleDays),
      items: itemsByOrder[o.order_id] || []
    }));

    res.json({
      success: true,
      page,
      totalPages: Math.max(Math.ceil(countRow.total / limit), 1),
      total: countRow.total,
      orders: result
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) {
      return res.status(400).json({ success: false, message: 'Invalid order id' });
    }
    const staleDays = readStaleDays(req);
    const [rows] = await db.query(`${GROUPED_SQL} WHERE o.order_id = ? GROUP BY o.order_id`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const itemsByOrder = await loadItems([id]);
    res.json({
      success: true,
      order: { ...describeOrder(rows[0], staleDays), items: itemsByOrder[id] || [] }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
