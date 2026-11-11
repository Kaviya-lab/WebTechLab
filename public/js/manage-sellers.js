requireRole('admin', 'superadmin');

// If your api.js fetch helper has another name, change it here only
const call = (url, options) => apiFetch(url, options);

let sellers = [];
let timer = null;

// Which buttons each status gets
const BUTTONS = {
  pending: [['approve', 'Approve'], ['reject', 'Reject']],
  active: [['block', 'Block']],
  blocked: [['unblock', 'Unblock']]
};

function render() {
  const body = document.getElementById('body');
  if (sellers.length === 0) {
    body.innerHTML = '<tr><td colspan="7">No sellers found</td></tr>';
    return;
  }
  body.innerHTML = sellers.map(s => {
    const buttons = (BUTTONS[s.status] || [])
      .map(([action, label]) => `<button data-id="${s.user_id}" data-action="${action}">${label}</button>`)
      .join(' ');
    return `<tr>
      <td>${escapeHTML(String(s.user_id))}</td>
      <td>${escapeHTML(s.name)}</td>
      <td>${escapeHTML(s.email)}</td>
      <td>${escapeHTML(s.mobile || '-')}</td>
      <td>${statusBadge(s.status)}</td>
      <td>${escapeHTML(formatDate(s.created_at))}</td>
      <td>${buttons || '-'}</td>
    </tr>`;
  }).join('');
}

async function load() {
  try {
    const params = new URLSearchParams();
    const status = document.getElementById('status').value;
    const search = document.getElementById('search').value.trim();
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    const data = await call('/api/sellers?' + params.toString());
    sellers = data.sellers;
    render();
  } catch (err) {
    showMessage(err.message, 'error');
  }
}

document.getElementById('status').addEventListener('change', load);
document.getElementById('search').addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(load, 300);
});

document.getElementById('body').addEventListener('click', async e => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  btn.disabled = true;
  try {
    const data = await call(`/api/sellers/${btn.dataset.id}/${btn.dataset.action}`, { method: 'PATCH' });
    const s = sellers.find(x => String(x.user_id) === btn.dataset.id);
    if (s) s.status = data.status;
    // If a status filter is on and the row no longer matches, drop it
    const filter = document.getElementById('status').value;
    if (filter) sellers = sellers.filter(x => x.status === filter);
    render();
    showMessage(data.message, 'success');
  } catch (err) {
    btn.disabled = false;
    showMessage(err.message, 'error');
  }
});

load();
