// ===== Shared frontend helper: include on every page BEFORE the page's own script =====
// <script src="/js/api.js"></script>

const API_BASE = '/api';

// ---------- Session (localStorage) ----------
function saveSession(data) {
  localStorage.setItem('token', data.token);
  localStorage.setItem('role', data.role);
  localStorage.setItem('name', data.name || '');
}

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const token = getToken();
  if (!token) return null;
  return { token, role: localStorage.getItem('role'), name: localStorage.getItem('name') };
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('name');
  window.location.href = '/login.html';
}

const DASHBOARDS = {
  customer: '/customer-dashboard.html',
  seller: '/seller-dashboard.html',
  admin: '/admin-dashboard.html',
  superadmin: '/superadmin-dashboard.html'
};

function redirectToDashboard(role) {
  window.location.href = DASHBOARDS[role] || '/index.html';
}

// Page protection (UX only; the real check is on the server)
// Usage: requireRole('seller')  or  requireRole('admin', 'superadmin')
function requireRole(...roles) {
  const user = getUser();
  if (!user) {
    window.location.href = '/login.html';
    return null;
  }
  if (!roles.includes(user.role)) {
    window.location.href = '/login.html';
    return null;
  }
  return user;
}

// ---------- Fetch wrapper ----------
// api('/products?search=phone')
// api('/cart', { method: 'POST', body: { product_id: 1, quantity: 2 } })
// api('/products', { method: 'POST', body: formData })   <- FormData (image upload)
async function api(path, options = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const config = { method: options.method || 'GET', headers };

  if (options.body instanceof FormData) {
    config.body = options.body; // browser sets the Content-Type itself
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(API_BASE + path, config);
  } catch (networkErr) {
    throw new Error('Cannot reach the server. Is it running?');
  }

  let data = {};
  try {
    data = await response.json();
  } catch (e) {
    /* response had no JSON body */
  }

  // Token missing/expired -> back to login (but not for the login call itself)
  if (response.status === 401 && token) {
    logout();
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok || data.success === false) {
    const err = new Error(data.message || 'Something went wrong');
    err.status = response.status;
    throw err;
  }
  return data;
}

// ---------- UI helpers ----------

// Show a message in an element: showMessage('msg', 'Saved!', 'success')  (type: success | error | info)
function showMessage(elementId, text, type = 'error') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.className = 'alert alert-' + type;
  el.textContent = text;
  el.classList.remove('hidden');
}

function clearMessage(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.classList.add('hidden');
}

// Inline field errors. Needs <input id="email"> and <div class="field-error" id="email-error"></div>
function setFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const err = document.getElementById(fieldId + '-error');
  if (input) input.classList.add('invalid');
  if (err) err.textContent = message;
}

function clearFieldErrors(formEl) {
  formEl.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
  formEl.querySelectorAll('.field-error').forEach((el) => (el.textContent = ''));
}

// Escape text before putting it in innerHTML (prevents XSS)
function escapeHTML(value) {
  const div = document.createElement('div');
  div.textContent = value === null || value === undefined ? '' : String(value);
  return div.innerHTML;
}

function formatPrice(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(status) {
  return `<span class="badge badge-${escapeHTML(status)}">${escapeHTML(status)}</span>`;
}

// Read ?id=5 from the URL: getQueryParam('id')
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// ---------- Navbar (changes with the logged-in role) ----------
const NAV_LINKS = {
  guest: [
    ['Products', '/products.html'],
    ['Login', '/login.html'],
    ['Register', '/register.html']
  ],
  customer: [
    ['Dashboard', '/customer-dashboard.html'],
    ['Products', '/products.html'],
    ['Cart', '/cart.html'],
    ['My Orders', '/my-orders.html'],
    ['Profile', '/profile.html']
  ],
  seller: [
    ['Dashboard', '/seller-dashboard.html'],
    ['My Products', '/seller-products.html'],
    ['Add Product', '/add-product.html'],
    ['Orders', '/seller-orders.html'],
    ['Reports', '/seller-reports.html']
  ],
  admin: [
    ['Dashboard', '/admin-dashboard.html'],
    ['Customers', '/manage-customers.html'],
    ['Sellers', '/manage-sellers.html'],
    ['Products', '/manage-products.html'],
    ['Categories', '/manage-categories.html'],
    ['Reports', '/admin-reports.html']
  ],
  superadmin: [
    ['Dashboard', '/superadmin-dashboard.html'],
    ['Admins', '/manage-admins.html'],
    ['Logs', '/system-logs.html'],
    ['Settings', '/system-settings.html'],
    ['Reports', '/admin-reports.html']
  ]
};

// Put <div id="navbar"></div> at the top of every page, then call renderNavbar()
function renderNavbar() {
  const holder = document.getElementById('navbar');
  if (!holder) return;

  const user = getUser();
  const links = NAV_LINKS[user ? user.role : 'guest'] || NAV_LINKS.guest;

  const items = links.map(([label, href]) => `<li><a href="${href}">${label}</a></li>`).join('');
  const userPart = user
    ? `<li class="nav-user">Hi, ${escapeHTML(user.name)} (${escapeHTML(user.role)})</li>
       <li><button id="logout-btn">Logout</button></li>`
    : '';

  holder.innerHTML = `
    <nav class="navbar">
      <a class="brand" href="/index.html">Marketplace</a>
      <ul class="nav-links">${items}${userPart}</ul>
    </nav>`;

  const btn = document.getElementById('logout-btn');
  if (btn) btn.addEventListener('click', logout);
}

document.addEventListener('DOMContentLoaded', renderNavbar);
