// public/js/seller-orders.js – Seller order fulfillment management

(function () {
  'use strict';

  const ordersList = document.getElementById('orders-list');
  const loading = document.getElementById('loading');
  const empty = document.getElementById('empty');

  // Status display labels and colours (mirrors badge classes in style.css)
  const STATUS_LABELS = {
    pending:    'Pending',
    processing: 'Processing',
    shipped:    'Shipped',
    delivered:  'Delivered',
    cancelled:  'Cancelled'
  };

  // Valid next states from each current state
  const NEXT_STATES = {
    pending:    ['processing', 'cancelled'],
    processing: ['shipped',    'cancelled'],
    shipped:    ['delivered',  'cancelled'],
    delivered:  [],
    cancelled:  []
  };

  // ── Build dropdown options for allowed transitions ──────────────────────────
  function transitionOptions(currentStatus) {
    const next = NEXT_STATES[currentStatus] || [];
    if (next.length === 0) return '';

    const opts = next.map(s =>
      `<option value="${s}">${STATUS_LABELS[s] || s}</option>`
    ).join('');

    return `
      <div class="actions-cell" style="align-items:center;">
        <select class="status-select" data-current="${currentStatus}">
          <option value="">Change status…</option>
          ${opts}
        </select>
        <button class="btn btn-sm update-btn">Update</button>
      </div>`;
  }

  // ── Render one order group (header + items table) ──────────────────────────
  function renderOrder(order) {
    const itemRows = order.items.map(item => `
      <tr data-item-id="${item.order_item_id}">
        <td>${escapeHTML(item.product_name)}</td>
        <td>${escapeHTML(String(item.quantity))}</td>
        <td>${formatPrice(item.price)}</td>
        <td>${formatPrice(item.subtotal)}</td>
        <td class="status-cell">${statusBadge(item.item_status)}</td>
        <td class="action-col">${transitionOptions(item.item_status)}</td>
      </tr>`).join('');

    return `
      <div class="order-group" id="order-${order.order_id}">
        <div class="order-group-header">
          <strong>Order #${escapeHTML(String(order.order_id))}</strong>
          <span class="text-muted">${formatDate(order.order_date)}</span>
          <span>Customer: <strong>${escapeHTML(order.customer_name)}</strong></span>
          <span>Overall: ${statusBadge(order.order_status)}</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Subtotal</th>
                <th>Item Status</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
        </div>
      </div>`;
  }

  // ── Update a single item status ─────────────────────────────────────────────
  async function handleUpdate(btn) {
    const tr = btn.closest('tr');
    const itemId = tr.dataset.itemId;
    const select = tr.querySelector('.status-select');
    const newStatus = select.value;

    if (!newStatus) {
      showMessage('msg', 'Please select a status to update to.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = '…';
    clearMessage('msg');

    try {
      const data = await api(`/orders/items/${itemId}/status`, {
        method: 'PUT',
        body: { status: newStatus }
      });

      // Update item row status badge + rebuild dropdown
      const statusCell = tr.querySelector('.status-cell');
      statusCell.innerHTML = statusBadge(data.item_status);

      const actionCol = tr.querySelector('.action-col');
      actionCol.innerHTML = transitionOptions(data.item_status);

      // Rewire listeners on new dropdown
      wireRow(tr);

      // Update overall order badge in the group header
      const orderGroup = document.getElementById(`order-${data.order_id}`);
      if (orderGroup) {
        const overallBadge = orderGroup.querySelector('.order-group-header .badge');
        if (overallBadge) {
          const span = overallBadge.parentElement;
          span.innerHTML = `Overall: ${statusBadge(data.order_status)}`;
        }
      }

      showMessage('msg', `Item status updated to "${STATUS_LABELS[data.item_status]}".`, 'success');
    } catch (err) {
      showMessage('msg', err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Update';
    }
  }

  // ── Wire event listeners on a single table row ──────────────────────────────
  function wireRow(tr) {
    const btn = tr.querySelector('.update-btn');
    if (btn) btn.addEventListener('click', () => handleUpdate(btn));
  }

  // ── Load orders ─────────────────────────────────────────────────────────────
  async function loadOrders() {
    try {
      const data = await api('/orders/seller');
      loading.classList.add('hidden');

      if (!data.orders || data.orders.length === 0) {
        empty.classList.remove('hidden');
        return;
      }

      ordersList.innerHTML = data.orders.map(renderOrder).join('');

      // Wire all update buttons
      ordersList.querySelectorAll('tr[data-item-id]').forEach(wireRow);
    } catch (err) {
      loading.classList.add('hidden');
      showMessage('msg', err.message, 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!requireRole('seller')) return;
    loadOrders();
  });
})();
