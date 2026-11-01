const token = localStorage.getItem('token');
const role = localStorage.getItem('role');

// UX only: the server enforces the real protection
if (!token || !['admin', 'superadmin'].includes(role)) {
  window.location.href = 'login.html';
}

let currentPage = 1;
let totalPages = 1;

const $ = id => document.getElementById(id);

function showMessage(text) {
  $('message').textContent = text || '';
}

async function apiGet(url) {
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (res.status === 401) {
    window.location.href = 'login.html';
    return null;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function badge(text) {
  const span = document.createElement('span');
  span.className = 'badge ' + text;
  span.textContent = text.replace(/_/g, ' ');
  return span;
}

function cell(content) {
  const td = document.createElement('td');
  if (content instanceof Node) td.appendChild(content);
  else td.textContent = content;
  return td;
}

function buildItemsTable(items) {
  const table = document.createElement('table');
  const head = table.insertRow();
  ['Product', 'Qty', 'Subtotal', 'Seller', 'Item status'].forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    head.appendChild(th);
  });
  items.forEach(i => {
    const r = table.insertRow();
    r.appendChild(cell(i.product_name));
    r.appendChild(cell(String(i.quantity)));
    r.appendChild(cell('₹' + Number(i.subtotal).toFixed(2)));
    r.appendChild(cell(i.seller_name + ' (#' + i.seller_id + ')'));
    r.appendChild(cell(badge(i.item_status)));
  });
  return table;
}

function renderOrders(orders) {
  const body = $('ordersBody');
  body.innerHTML = '';
  if (orders.length === 0) {
    const r = body.insertRow();
    const td = cell('No orders found');
    td.colSpan = 8;
    r.appendChild(td);
    return;
  }
  orders.forEach(o => {
    const row = body.insertRow();
    row.appendChild(cell('#' + o.order_id));
    row.appendChild(cell(o.customer_name + ' (' + o.customer_email + ')'));
    row.appendChild(cell(new Date(o.order_date).toLocaleDateString()));
    row.appendChild(cell('₹' + Number(o.total_amount).toFixed(2)));
    row.appendChild(cell(badge(o.order_status)));
    row.appendChild(cell(badge(o.fulfilment)));

    const flags = document.createElement('span');
    if (o.fulfilment === 'partially_fulfilled') flags.appendChild(flagEl('Partial'));
    if (o.has_cancelled_and_active) flags.appendChild(flagEl('Cancelled + active'));
    if (o.is_stale) flags.appendChild(flagEl('Stale ' + o.age_days + 'd'));
    row.appendChild(cell(flags));

    const btn = document.createElement('button');
    btn.textContent = 'Items';
    row.appendChild(cell(btn));

    const detail = body.insertRow();
    detail.className = 'items-row';
    detail.style.display = 'none';
    const dtd = cell(buildItemsTable(o.items));
    dtd.colSpan = 8;
    detail.appendChild(dtd);

    btn.addEventListener('click', () => {
      detail.style.display = detail.style.display === 'none' ? '' : 'none';
    });
  });
}

function flagEl(text) {
  const s = document.createElement('span');
  s.className = 'flag';
  s.textContent = text;
  return s;
}

async function loadSummary() {
  const data = await apiGet('/api/admin/orders/summary?staleDays=' + encodeURIComponent($('staleDays').value));
  if (!data) return;
  $('cTotal').textContent = data.summary.total_orders;
  $('cPartial').textContent = data.summary.partially_fulfilled;
  $('cMixed').textContent = data.summary.cancelled_and_active;
  $('cStale').textContent = data.summary.stale_orders;
}

async function loadOrders() {
  showMessage('');
  const params = new URLSearchParams({
    page: currentPage,
    filter: $('filter').value,
    staleDays: $('staleDays').value
  });
  if ($('status').value) params.set('status', $('status').value);
  if ($('search').value.trim()) params.set('search', $('search').value.trim());

  try {
    const data = await apiGet('/api/admin/orders?' + params.toString());
    if (!data) return;
    totalPages = data.totalPages;
    renderOrders(data.orders);
    $('pageInfo').textContent = 'Page ' + data.page + ' of ' + data.totalPages + ' (' + data.total + ' orders)';
    $('prev').disabled = currentPage <= 1;
    $('next').disabled = currentPage >= totalPages;
  } catch (err) {
    showMessage(err.message);
  }
}

async function refreshAll() {
  try {
    await loadSummary();
  } catch (err) {
    showMessage(err.message);
  }
  await loadOrders();
}

$('apply').addEventListener('click', () => { currentPage = 1; refreshAll(); });
$('prev').addEventListener('click', () => { if (currentPage > 1) { currentPage--; loadOrders(); } });
$('next').addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; loadOrders(); } });

refreshAll();
