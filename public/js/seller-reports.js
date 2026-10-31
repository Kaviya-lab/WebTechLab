// public/js/seller-reports.js – Seller Reports page logic

(function () {
  'use strict';

  const loading = document.getElementById('loading');
  const content = document.getElementById('report-content');
  const statsTop = document.getElementById('stats-top');
  const statsFulfillment = document.getElementById('stats-fulfillment');
  const chartSection = document.getElementById('chart-section');

  function statCard(value, label, borderColor) {
    return `
      <div class="stat-card" style="border-left-color:${borderColor}">
        <div class="value">${escapeHTML(String(value))}</div>
        <div class="label">${escapeHTML(label)}</div>
      </div>`;
  }

  async function loadReport() {
    try {
      const data = await api('/seller-reports/summary');
      loading.classList.add('hidden');
      const s = data.summary;

      // Top-level stats
      statsTop.innerHTML = [
        statCard(s.total_products,            'Total Products',     'var(--primary)'),
        statCard(s.total_orders,              'Total Orders',       '#7c3aed'),
        statCard(s.fulfilled_items,           'Items Delivered',    'var(--success)'),
        statCard(formatPrice(s.total_revenue),'Total Revenue',      '#16a34a'),
      ].join('');

      // Fulfillment breakdown
      const ib = s.items_by_status;
      statsFulfillment.innerHTML = [
        statCard(ib.pending    || 0, 'Pending',    'var(--muted)'),
        statCard(ib.processing || 0, 'Processing', 'var(--warning)'),
        statCard(ib.shipped    || 0, 'Shipped',    '#0891b2'),
        statCard(ib.delivered  || 0, 'Delivered',  'var(--success)'),
        statCard(ib.cancelled  || 0, 'Cancelled',  'var(--danger)'),
      ].join('');

      content.classList.remove('hidden');

      // Optional Chart.js bar chart
      tryRenderChart(ib);
    } catch (err) {
      loading.classList.add('hidden');
      showMessage('msg', err.message, 'error');
    }
  }

  function tryRenderChart(ib) {
    // Wait up to 1.5 s for CDN script then draw – silently skip if unavailable
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window._chartJsLoaded && typeof Chart !== 'undefined') {
        clearInterval(interval);
        drawChart(ib);
      } else if (attempts > 15) {
        clearInterval(interval); // CDN unavailable – no chart, no error
      }
    }, 100);
  }

  function drawChart(ib) {
    chartSection.style.display = 'block';
    const ctx = document.getElementById('fulfillment-chart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
        datasets: [{
          label: 'Items',
          data: [
            ib.pending    || 0,
            ib.processing || 0,
            ib.shipped    || 0,
            ib.delivered  || 0,
            ib.cancelled  || 0
          ],
          backgroundColor: [
            '#9ca3af', '#f59e0b', '#0891b2', '#16a34a', '#dc2626'
          ],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!requireRole('seller')) return;
    loadReport();
  });
})();
