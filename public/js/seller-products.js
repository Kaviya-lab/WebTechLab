// public/js/seller-products.js – Seller product management list

(function () {
  'use strict';

  const body = document.getElementById('products-body');
  const tableWrap = document.getElementById('table-wrap');
  const loading = document.getElementById('loading');
  const empty = document.getElementById('empty');

  function row(p) {
    const imgSrc = p.image ? `/uploads/${escapeHTML(p.image)}` : null;
    const img = imgSrc
      ? `<img class="thumb" src="${imgSrc}" alt="${escapeHTML(p.product_name)}" />`
      : `<div class="thumb" style="display:flex;align-items:center;justify-content:center;background:var(--border);font-size:1.4rem;">📦</div>`;

    return `
      <tr data-id="${p.product_id}">
        <td>${img}</td>
        <td><strong>${escapeHTML(p.product_name)}</strong></td>
        <td>${escapeHTML(p.category_name)}</td>
        <td>${formatPrice(p.price)}</td>
        <td>${escapeHTML(String(p.stock_quantity))}</td>
        <td>${statusBadge(p.status)}</td>
        <td>
          <div class="actions-cell">
            <a href="/add-product.html?edit=${p.product_id}" class="btn btn-sm btn-outline">Edit</a>
            <button class="btn btn-sm btn-danger delete-btn" data-id="${p.product_id}" data-name="${escapeHTML(p.product_name)}">Delete</button>
          </div>
        </td>
      </tr>`;
  }

  async function loadProducts() {
    try {
      const data = await api('/products/my');
      loading.classList.add('hidden');

      if (!data.products || data.products.length === 0) {
        empty.classList.remove('hidden');
        return;
      }

      body.innerHTML = data.products.map(row).join('');
      tableWrap.classList.remove('hidden');

      // Wire delete buttons
      tableWrap.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', deleteProduct);
      });
    } catch (err) {
      loading.classList.add('hidden');
      showMessage('msg', err.message, 'error');
    }
  }

  async function deleteProduct(e) {
    const btn = e.currentTarget;
    const id = btn.dataset.id;
    const name = btn.dataset.name;

    if (!confirm(`Deactivate "${name}"? It will no longer be visible to customers.`)) return;

    btn.disabled = true;
    btn.textContent = '…';

    try {
      await api(`/products/${id}`, { method: 'DELETE' });
      // Remove row from table or reload
      const tr = tableWrap.querySelector(`tr[data-id="${id}"]`);
      if (tr) tr.remove();
      showMessage('msg', `"${name}" has been deactivated.`, 'success');
      // Show empty state if table is now empty
      if (tableWrap.querySelectorAll('tbody tr').length === 0) {
        tableWrap.classList.add('hidden');
        empty.classList.remove('hidden');
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Delete';
      showMessage('msg', err.message, 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!requireRole('seller')) return;
    loadProducts();
  });
})();
