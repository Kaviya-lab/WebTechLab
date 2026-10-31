// public/js/product-details.js – Product detail page logic

(function () {
  'use strict';

  const loading = document.getElementById('loading');
  const notFound = document.getElementById('not-found');
  const wrap = document.getElementById('product-wrap');
  const detail = document.getElementById('product-detail');

  async function loadProduct() {
    const id = getQueryParam('id');
    if (!id) {
      loading.classList.add('hidden');
      notFound.classList.remove('hidden');
      return;
    }

    try {
      const data = await api(`/products/${id}`);
      loading.classList.add('hidden');

      const p = data.product;

      // Update page title
      document.title = `${p.product_name} – Marketplace`;

      const imgSrc = p.image ? `/uploads/${escapeHTML(p.image)}` : null;
      const imgTag = imgSrc
        ? `<img src="${imgSrc}" alt="${escapeHTML(p.product_name)}" />`
        : `<div style="height:320px;display:flex;align-items:center;justify-content:center;background:var(--border);color:var(--muted);font-size:4rem;border-radius:var(--radius);">📦</div>`;

      const inStock = p.stock_quantity > 0;
      const stockBadge = inStock
        ? `<span class="badge-in">In Stock (${escapeHTML(String(p.stock_quantity))} available)</span>`
        : `<span class="badge-out">Out of Stock</span>`;

      const user = getUser();
      let cartSection = '';
      if (user && user.role === 'customer' && inStock) {
        cartSection = `
          <div class="qty-row">
            <label for="qty"><strong>Quantity:</strong></label>
            <input type="number" id="qty" min="1" max="${p.stock_quantity}" value="1" />
          </div>
          <button class="btn btn-success" id="add-cart-btn" style="width:200px;">Add to Cart</button>`;
      } else if (!user) {
        cartSection = `<p><a href="/login.html" class="btn btn-outline">Log in to purchase</a></p>`;
      }

      const statusNote = p.status === 'inactive'
        ? `<div class="alert alert-error" style="margin-bottom:0;">This product is currently unavailable.</div>`
        : '';

      detail.innerHTML = `
        <div style="padding:20px;">
          ${statusNote}
          <div class="product-detail" style="padding:0;box-shadow:none;margin-top:${p.status === 'inactive' ? '16px' : '0'}">
            ${imgTag}
            <div class="info">
              <h1 style="font-size:1.5rem;margin-bottom:0;">${escapeHTML(p.product_name)}</h1>
              <div class="price">${formatPrice(p.price)}</div>

              ${p.description
                ? `<p style="color:var(--muted);line-height:1.7;">${escapeHTML(p.description)}</p>`
                : ''}

              <div class="meta-row">
                <div class="meta-item">
                  <strong>Category</strong>${escapeHTML(p.category_name)}
                </div>
                <div class="meta-item">
                  <strong>Sold by</strong>${escapeHTML(p.seller_name)}
                </div>
              </div>

              <div>${stockBadge}</div>

              ${cartSection}
              <div id="msg" class="alert hidden"></div>
            </div>
          </div>
        </div>`;

      wrap.classList.remove('hidden');

      // Wire add-to-cart
      const cartBtn = document.getElementById('add-cart-btn');
      if (cartBtn) {
        cartBtn.addEventListener('click', async () => {
          const qty = parseInt(document.getElementById('qty').value, 10) || 1;
          cartBtn.disabled = true;
          cartBtn.textContent = 'Adding…';
          clearMessage('msg');

          try {
            await api('/cart/items', {
              method: 'POST',
              body: { product_id: p.product_id, quantity: qty }
            });
            cartBtn.textContent = 'Added to Cart ✓';
            cartBtn.classList.remove('btn-success');
            showMessage('msg', `${p.product_name} added to your cart!`, 'success');
          } catch (err) {
            cartBtn.disabled = false;
            cartBtn.textContent = 'Add to Cart';
            showMessage('msg', err.message || 'Could not add to cart', 'error');
          }
        });
      }
    } catch (err) {
      loading.classList.add('hidden');
      if (err.status === 404) {
        notFound.classList.remove('hidden');
      } else {
        showMessage('msg', err.message, 'error');
        document.getElementById('product-wrap').classList.remove('hidden');
      }
    }
  }

  document.addEventListener('DOMContentLoaded', loadProduct);
})();
