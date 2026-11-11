requireRole('admin', 'superadmin');

const call = (url, options) => api(url, options);

const LABELS = [
  ['total_users', 'Total users'],
  ['total_customers', 'Customers'],
  ['total_sellers', 'Sellers'],
  ['total_products', 'Products'],
  ['total_orders', 'Orders'],
  ['total_revenue', 'Revenue']
];

async function loadSummary() {
  try {
    const data = await call('/reports/summary');
    const s = data.summary;
    document.getElementById('cards').innerHTML = LABELS.map(([key, label]) => {
      const value = key === 'total_revenue' ? '₹' + Number(s[key]).toFixed(2) : s[key];
      return `<div class="card"><b>${escapeHTML(String(value))}</b>${escapeHTML(label)}</div>`;
    }).join('');
  } catch (err) {
    // A 403 here means the admin does not have view_reports
    showMessage('message', err.message, 'error');
  }
}

loadSummary();
