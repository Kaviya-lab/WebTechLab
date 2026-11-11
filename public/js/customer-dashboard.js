const dashUser = requireRole('customer');
if (dashUser) {
  document.getElementById('welcome').textContent = `Welcome, ${dashUser.name}`;

  function statCard(label, value) {
    return `<div class="stat-card"><div class="value">${value}</div><div class="label">${label}</div></div>`;
  }

  async function loadDashboard() {
    try {
      const [orderData, cartData] = await Promise.all([api('/orders/mine'), api('/cart')]);
      const orders = orderData.orders;

      const inProgress = orders.filter((o) => ['pending', 'confirmed', 'shipped'].includes(o.order_status)).length;
      const delivered = orders.filter((o) => o.order_status === 'delivered').length;

      document.getElementById('stats').innerHTML =
        statCard('Total orders', orders.length) +
        statCard('In progress', inProgress) +
        statCard('Delivered', delivered) +
        statCard('Items in cart', cartData.count);

      const recent = document.getElementById('recent');
      if (orders.length === 0) {
        recent.innerHTML = '<p class="text-muted">You have not placed any orders yet.</p>';
        return;
      }
      recent.innerHTML = `
        <div class="table-wrap"><table>
          <tr><th>Order</th><th>Date</th><th>Status</th><th>Total</th><th></th></tr>
          ${orders.slice(0, 5).map((o) => `
            <tr>
              <td>#${o.order_id}</td>
              <td>${formatDate(o.order_date)}</td>
              <td>${statusBadge(o.order_status)}</td>
              <td>${formatPrice(o.total_amount)}</td>
              <td><a href="/my-orders.html">Details</a></td>
            </tr>`).join('')}
        </table></div>`;
    } catch (err) {
      showMessage('msg', err.message);
    }
  }

  loadDashboard();
}
