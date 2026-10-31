// public/js/seller-dashboard.js – Seller Dashboard page logic

(function () {
  'use strict';

  const loading = document.getElementById('loading');
  const content = document.getElementById('dashboard-content');
  const statsGrid = document.getElementById('stats-grid');

  function statCard(value, label, borderColor) {
    return `
      <div class="stat-card" style="border-left-color:${borderColor}">
        <div class="value">${escapeHTML(String(value))}</div>
        <div class="label">${escapeHTML(label)}</div>
      </div>`;
  }

  async function loadDashboard() {
    const user = requireRole('seller');
    if (!user) return;

    document.getElementById('welcome-msg').textContent = `Welcome back, ${user.name}!`;

    try {
      const data = await api('/seller-reports/summary');
      loading.classList.add('hidden');

      const s = data.summary;
      const pending = s.items_by_status.pending   || 0;
      const processing = s.items_by_status.processing || 0;
      const shipped  = s.items_by_status.shipped   || 0;
      const delivered = s.items_by_status.delivered || 0;

      statsGrid.innerHTML = [
        statCard(s.total_products,              'Total Products',      'var(--primary)'),
        statCard(s.total_orders,                'Total Orders',        '#7c3aed'),
        statCard(pending + processing,          'Pending / Processing','var(--warning)'),
        statCard(shipped,                       'Items Shipped',       '#0891b2'),
        statCard(delivered,                     'Items Delivered',     'var(--success)'),
        statCard(formatPrice(s.total_revenue),  'Total Revenue',       '#16a34a'),
      ].join('');

      content.classList.remove('hidden');
    } catch (err) {
      loading.classList.add('hidden');
      showMessage('msg', err.message, 'error');
      content.classList.remove('hidden');
    }
  }

  document.addEventListener('DOMContentLoaded', loadDashboard);
})();
