// public/js/products.js – Product listing page logic

(function () {
  'use strict';

  let currentPage = 1;
  let currentCategory = '';
  let currentSearch = '';
  let debounceTimer = null;

  const grid = document.getElementById('product-grid');
  const loading = document.getElementById('loading');
  const empty = document.getElementById('empty');
  const pagination = document.getElementById('pagination');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const chipBar = document.getElementById('category-chips');

  function showLoading() {
    loading.classList.remove('hidden');
    grid.classList.add('hidden');
    empty.classList.add('hidden');
    pagination.classList.add('hidden');
  }

  function hideLoading() {
    loading.classList.add('hidden');
  }

  // ── Load categories and build chips ────────────────────────────────────────
  async function loadCategories() {
    try {
      const data = await api('/categories');
      data.categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'chip';
        btn.dataset.id = cat.category_id;
        btn.textContent = cat.category_name;
        btn.addEventListener('click', () => selectChip(btn, cat.category_id));
        chipBar.appendChild(btn);
      });
    } catch (_) {
      // Non-critical; page still works without category chips
    }
  }

  function selectChip(btn, catId) {
    chipBar.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = catId;
    currentPage = 1;
    loadProducts();
  }

  // ── Build product card HTML ─────────────────────────────────────────────────
  function productCard(p) {
    const imgSrc = p.image ? `/uploads/${escapeHTML(p.image)}` : null;
    const imgTag = imgSrc
      ? `<img src="${imgSrc}" alt="${escapeHTML(p.product_name)}" loading="lazy" />`
      : `<div style="height:170px;display:flex;align-items:center;justify-content:center;background:var(--border);color:var(--muted);font-size:2.5rem;">📦</div>`;

    const inStock = p.stock_quantity > 0;
    const stockBadge = inStock
      ? `<span class="badge-in">In Stock</span>`
      : `<span class="badge-out">Out of Stock</span>`;

    const user = getUser();
    const cartBtn = (user && user.role === 'customer' && inStock)
      ? `<button class="btn btn-sm btn-success" data-id="${p.product_id}" data-name="${escapeHTML(p.product_name)}">Add to Cart</button>`
      : '';

    return `
      <div class="card product-card">
        <a href="/product-details.html?id=${p.product_id}" style="display:block;text-decoration:none;color:inherit;">
          ${imgTag}
          <div class="info">
            <div class="name">${escapeHTML(p.product_name)}</div>
            <div class="meta">${escapeHTML(p.category_name)} · ${escapeHTML(p.seller_name)}</div>
            <div class="price">${formatPrice(p.price)}</div>
            <div class="meta">${stockBadge}</div>
          </div>
        </a>
        <div class="actions">
          <a href="/product-details.html?id=${p.product_id}" class="btn btn-outline btn-sm" style="flex:1;text-align:center;">View Details</a>
          ${cartBtn}
        </div>
      </div>`;
  }

  // ── Load products from API ──────────────────────────────────────────────────
  async function loadProducts() {
    showLoading();
    clearMessage('msg');

    try {
      let url = `/products?page=${currentPage}`;
      if (currentSearch) url += `&search=${encodeURIComponent(currentSearch)}`;
      if (currentCategory) url += `&category_id=${currentCategory}`;

      const data = await api(url);
      hideLoading();

      if (!data.products || data.products.length === 0) {
        empty.classList.remove('hidden');
        return;
      }

      grid.innerHTML = data.products.map(productCard).join('');
      grid.classList.remove('hidden');

      // Wire up inline Add-to-cart buttons
      grid.querySelectorAll('[data-id]').forEach(btn => {
        btn.addEventListener('click', addToCart);
      });

      renderPagination(data.total, data.limit, data.page);
    } catch (err) {
      hideLoading();
      showMessage('msg', err.message, 'error');
    }
  }

  // ── Add to cart ─────────────────────────────────────────────────────────────
  async function addToCart(e) {
    const btn = e.currentTarget;
    const productId = btn.dataset.id;
    const name = btn.dataset.name;
    btn.disabled = true;
    btn.textContent = 'Adding…';

    try {
      await api('/cart/items', {
        method: 'POST',
        body: { product_id: parseInt(productId, 10), quantity: 1 }
      });
      btn.textContent = 'Added ✓';
      btn.classList.remove('btn-success');
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Add to Cart';
      showMessage('msg', err.message || 'Could not add to cart', 'error');
    }
  }

  // ── Pagination ──────────────────────────────────────────────────────────────
  function renderPagination(total, limit, page) {
    const pages = Math.ceil(total / limit);
    if (pages <= 1) {
      pagination.classList.add('hidden');
      return;
    }

    let html = '';
    if (page > 1) {
      html += `<button class="btn btn-outline btn-sm" data-page="${page - 1}">← Prev</button>`;
    }
    html += `<span class="text-muted">Page ${page} of ${pages}</span>`;
    if (page < pages) {
      html += `<button class="btn btn-outline btn-sm" data-page="${page + 1}">Next →</button>`;
    }

    pagination.innerHTML = html;
    pagination.classList.remove('hidden');

    pagination.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.dataset.page, 10);
        loadProducts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  // ── Search ──────────────────────────────────────────────────────────────────
  function triggerSearch() {
    currentSearch = searchInput.value.trim();
    currentPage = 1;
    loadProducts();
  }

  searchBtn.addEventListener('click', triggerSearch);
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') triggerSearch();
  });
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(triggerSearch, 500);
  });

  // Handle "All Categories" chip click
  chipBar.querySelector('[data-id=""]').addEventListener('click', function () {
    selectChip(this, '');
  });

  // ── Init ────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    await loadCategories();
    loadProducts();
  });
})();
