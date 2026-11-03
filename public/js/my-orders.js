if (requireRole('customer')) {
  const box = document.getElementById('orders');

  // Same rule as the server: cancel only while nothing has shipped
  function canCancel(order) {
    return order.order_status !== 'cancelled' &&
      !order.items.some((i) => ['shipped', 'delivered'].includes(i.item_status));
  }

  function fulfilmentSummary(order) {
    const active = order.items.filter((i) => i.item_status !== 'cancelled');
    const sent = active.filter((i) => ['shipped', 'delivered'].includes(i.item_status)).length;
    if (active.length === 0) return 'All items cancelled';
    if (sent === 0) return 'Not shipped yet';
    return `${sent} of ${active.length} items shipped`;
  }

  async function loadOrders() {
    try {
      const { orders } = await api('/orders/mine');
      if (orders.length === 0) {
        box.innerHTML = '<p class="text-muted">You have not placed any orders yet.</p>';
        return;
      }
      box.innerHTML = orders.map((o) => {
        const rows = o.items.map((i) => `
          <tr>
            <td>${escapeHTML(i.product_name)}</td>
            <td>${escapeHTML(i.seller_name)}</td>
            <td>${i.quantity}</td>
            <td>${formatPrice(i.subtotal)}</td>
            <td>${statusBadge(i.item_status)}</td>
          </tr>`).join('');
        return `
          <div class="card mt">
            <div class="flex">
              <strong>Order #${o.order_id}</strong>
              <span class="text-muted">${formatDate(o.order_date)}</span>
              ${statusBadge(o.order_status)}
              <strong>${formatPrice(o.total_amount)}</strong>
              ${canCancel(o) ? `<button class="btn btn-danger btn-sm" data-cancel="${o.order_id}">Cancel order</button>` : ''}
            </div>
            <p class="text-muted">${escapeHTML(fulfilmentSummary(o))}</p>
            <div class="table-wrap mt">
              <table>
                <tr><th>Product</th><th>Seller</th><th>Qty</th><th>Subtotal</th><th>Status</th></tr>
                ${rows}
              </table>
            </div>
          </div>`;
      }).join('');
    } catch (err) {
      showMessage('msg', err.message);
    }
  }

  box.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-cancel]');
    if (!btn || !confirm('Cancel this order?')) return;
    btn.disabled = true;
    try {
      await api(`/orders/${btn.dataset.cancel}/cancel`, { method: 'PUT' });
      showMessage('msg', 'Order cancelled', 'success');
    } catch (err) {
      showMessage('msg', err.message);
    }
    loadOrders();
  });

  loadOrders();
}
