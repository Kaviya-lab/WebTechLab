const express = require('express');
const db = require('../config/db');
const { authenticate, allowRoles } = require('../middleware/auth');
const { requirePermission } = require('../middleware/role');

const router = express.Router();

router.use(authenticate, allowRoles('admin', 'superadmin'), requirePermission('view_reports'));

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ITEM_FROM = `
  FROM order_items oi
  JOIN orders o ON o.order_id = oi.order_id
  JOIN products p ON p.product_id = oi.product_id`;

// Validates the optional filters and builds the WHERE parts
function buildFilters(q) {
  const conds = [];
  const params = [];
  const { from, to } = q;

  if (from) {
    if (!DATE_RE.test(from) || isNaN(Date.parse(from))) return { error: 'from must be a date in YYYY-MM-DD format' };
    conds.push('o.order_date >= ?');
    params.push(from);
  }
  if (to) {
    if (!DATE_RE.test(to) || isNaN(Date.parse(to))) return { error: 'to must be a date in YYYY-MM-DD format' };
    conds.push('o.order_date < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(to);
  }
  if (from && to && from > to) return { error: 'from must not be after to' };

  let sellerId = null;
  let categoryId = null;
  if (q.seller_id) {
    sellerId = parseInt(q.seller_id, 10);
    if (!sellerId) return { error: 'seller_id must be a number' };
    conds.push('oi.seller_id = ?');
    params.push(sellerId);
  }
  if (q.category_id) {
    categoryId = parseInt(q.category_id, 10);
    if (!categoryId) return { error: 'category_id must be a number' };
    conds.push('p.category_id = ?');
    params.push(categoryId);
  }
  return { conds, params, sellerId, categoryId };
}

// GET /api/reports/summary?from=&to=&seller_id=&category_id=
router.get('/summary', async (req, res, next) => {
  try {
    const f = buildFilters(req.query);
    if (f.error) {
      return res.status(400).json({ success: false, message: f.error });
    }
    const where = f.conds.length ? 'WHERE ' + f.conds.join(' AND ') : '';
    const activeWhere = (where ? where + ' AND' : 'WHERE') + " oi.item_status <> 'cancelled'";

    // User counts (not affected by the filters)
    const [[users]] = await db.query(
      `SELECT COUNT(*) AS total_users,
              COALESCE(SUM(role = 'customer'), 0) AS total_customers,
              COALESCE(SUM(role = 'seller'), 0) AS total_sellers
       FROM users`
    );

    // Product count (seller and category filters only)
    const pConds = [];
    const pParams = [];
    if (f.sellerId) { pConds.push('seller_id = ?'); pParams.push(f.sellerId); }
    if (f.categoryId) { pConds.push('category_id = ?'); pParams.push(f.categoryId); }
    const [[prod]] = await db.query(
      `SELECT COUNT(*) AS total_products FROM products ${pConds.length ? 'WHERE ' + pConds.join(' AND ') : ''}`,
      pParams
    );

    // Orders and revenue (revenue ignores cancelled items)
    const [[sales]] = await db.query(
      `SELECT COUNT(DISTINCT o.order_id) AS total_orders,
              COALESCE(SUM(CASE WHEN oi.item_status <> 'cancelled' THEN oi.subtotal ELSE 0 END), 0) AS total_revenue
       ${ITEM_FROM} ${where}`,
      f.params
    );

    const [byStatus] = await db.query(
      `SELECT o.order_status AS status, COUNT(DISTINCT o.order_id) AS count
       ${ITEM_FROM} ${where}
       GROUP BY o.order_status
       ORDER BY count DESC`,
      f.params
    );

    const [topSellers] = await db.query(
      `SELECT oi.seller_id, s.name, SUM(oi.subtotal) AS revenue
       ${ITEM_FROM}
       JOIN users s ON s.user_id = oi.seller_id
       ${activeWhere}
       GROUP BY oi.seller_id, s.name
       ORDER BY revenue DESC
       LIMIT 5`,
      f.params
    );

    const [topCategories] = await db.query(
      `SELECT c.category_name, SUM(oi.subtotal) AS revenue
       ${ITEM_FROM}
       JOIN categories c ON c.category_id = p.category_id
       ${activeWhere}
       GROUP BY c.category_id, c.category_name
       ORDER BY revenue DESC
       LIMIT 5`,
      f.params
    );

    res.json({
      success: true,
      summary: {
        total_users: Number(users.total_users),
        total_customers: Number(users.total_customers),
        total_sellers: Number(users.total_sellers),
        total_products: Number(prod.total_products),
        total_orders: Number(sales.total_orders),
        total_revenue: Number(sales.total_revenue)
      },
      orders_by_status: byStatus.map(r => ({ status: r.status, count: Number(r.count) })),
      top_sellers: topSellers.map(r => ({ seller_id: r.seller_id, name: r.name, revenue: Number(r.revenue) })),
      top_categories: topCategories.map(r => ({ category_name: r.category_name, revenue: Number(r.revenue) }))
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
