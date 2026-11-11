requireRole('admin', 'superadmin');

const call = (url, options) => api(url, options);

let customers = [];
let timer = null;

function render() {
  const body = document.getElementById('body');
  if (customers.length === 0) {
    body.innerHTML = '<tr><td colspan="7">No customers found</td></tr>';
    return;
  }
  body.innerHTML = customers.map(c => {
    const action = c.status === 'blocked' ? 'unblock' : 'block';
    const label = c.status === 'blocked' ? 'Unblock' : 'Block';
    return `<tr>
      <td>${escapeHTML(String(c.user_id))}</td>
      <td>${escapeHTML(c.name)}</td>
      <td>${escapeHTML(c.email)}</td>
      <td>${escapeHTML(c.mobile || '-')}</td>
      <td>${statusBadge(c.status)}</td>
      <td>${escapeHTML(formatDate(c.created_at))}</td>
      <td><button data-id="${c.user_id}" data-action="${action}">${label}</button></td>
    </tr>`;
  }).join('');
}

async function load() {
  try {
    const q = encodeURIComponent(document.getElementById('search').value.trim());
    const data = await call('/customers?search=' + q);
    customers = data.customers;
    render();
  } catch (err) {
    showMessage('message', err.message, 'error');
  }
}

// Search while typing (waits 300 ms after the last key)
document.getElementById('search').addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(load, 300);
});

// One listener for all Block / Unblock buttons
document.getElementById('body').addEventListener('click', async e => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  btn.disabled = true;
  try {
    const data = await call(`/customers/${btn.dataset.id}/${btn.dataset.action}`, { method: 'PATCH' });
    const c = customers.find(x => String(x.user_id) === btn.dataset.id);
    if (c) c.status = data.status;
    render(); // updates the row without reloading the page
    showMessage(data.message, 'success');
  } catch (err) {
    btn.disabled = false;
    showMessage('message', err.message, 'error');
  }
});

load();
