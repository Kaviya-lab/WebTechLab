// Single place that decides orders.order_status from order_items.item_status.
// Order status rules used by seller fulfillment in routes/sellerOrders:
//   all items cancelled                    -> cancelled
//   all non-cancelled items delivered      -> delivered
//   any non-cancelled item shipped         -> shipped
//   any non-cancelled item processing      -> confirmed
//   otherwise                              -> pending
function calcOrderStatus(itemStatuses) {
  const active = itemStatuses.filter((s) => s !== 'cancelled');
  if (active.length === 0) return 'cancelled';
  if (active.every((s) => s === 'delivered')) return 'delivered';
  if (active.some((s) => s === 'shipped')) return 'shipped';
  if (active.some((s) => s === 'processing')) return 'confirmed';
  return 'pending';
}

// conn = a DB connection (use the one inside your transaction)
async function recalculateOrderStatus(conn, orderId) {
  const [items] = await conn.query('SELECT item_status FROM order_items WHERE order_id = ?', [orderId]);
  if (items.length === 0) return null;
  const status = calcOrderStatus(items.map((i) => i.item_status));
  await conn.query('UPDATE orders SET order_status = ? WHERE order_id = ?', [status, orderId]);
  return status;
}

module.exports = { calcOrderStatus, recalculateOrderStatus };
