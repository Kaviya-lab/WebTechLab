requireRole('admin', 'superadmin');

// If your api.js fetch helper has another name, change it here only
const call = (url, options) => apiFetch(url, options);

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
    const data = await call('/api/reports/summary');
    const s = data.summary;
    document.getElementById('cards').innerHTML = LABELS.map(([key, label]) => {
      const value = key === 'total_revenue' ? '₹' + Number(s[key]).toFixed(2) : s[key];
      return `<div class="card"><b>${escapeHTML(String(value))}</b>${escapeHTML(label)}</div>`;
    }).join('');
  } catch (err) {
    // A 403 here means the admin does not have view_reports
    showMessage(err.message, 'error');
  }
}

loadSummary();
