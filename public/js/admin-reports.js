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

const money = n => '₹' + Number(n).toFixed(2);

function rows(list, build, emptyCols) {
  if (list.length === 0) return `<tr><td colspan="${emptyCols}">No data</td></tr>`;
  return list.map(build).join('');
}

async function load() {
  clearMessage('message');
  const params = new URLSearchParams();
  const from = document.getElementById('from').value;
  const to = document.getElementById('to').value;
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  try {
    const data = await call('/reports/summary?' + params.toString());

    document.getElementById('cards').innerHTML = LABELS.map(([key, label]) => {
      const v = key === 'total_revenue' ? money(data.summary[key]) : data.summary[key];
      return `<div class="card"><b>${escapeHTML(String(v))}</b>${escapeHTML(label)}</div>`;
    }).join('');

    document.getElementById('statusBody').innerHTML = rows(
      data.orders_by_status,
      r => `<tr><td>${statusBadge(r.status)}</td><td>${escapeHTML(String(r.count))}</td></tr>`,
      2
    );
    document.getElementById('sellersBody').innerHTML = rows(
      data.top_sellers,
      r => `<tr><td>${escapeHTML(r.name)}</td><td>${escapeHTML(money(r.revenue))}</td></tr>`,
      2
    );
    document.getElementById('categoriesBody').innerHTML = rows(
      data.top_categories,
      r => `<tr><td>${escapeHTML(r.category_name)}</td><td>${escapeHTML(money(r.revenue))}</td></tr>`,
      2
    );
  } catch (err) {
    showMessage('message', err.message, 'error'); // includes the 403 message for admins without view_reports
  }
}

document.getElementById('apply').addEventListener('click', load);
document.getElementById('clear').addEventListener('click', () => {
  document.getElementById('from').value = '';
  document.getElementById('to').value = '';
  load();
});

load();
