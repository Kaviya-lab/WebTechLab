(function () {
  const catBox = document.getElementById('categories');
  const grid = document.getElementById('featured');
  let activeCategory = '';

  function productCard(p) {
    return `
      <div class="card product-card">
        <a href="/product-details.html?id=${p.product_id}" style="display:block;text-decoration:none;color:inherit;">
          <img src="${productImage(p.image)}" alt="${escapeHTML(p.product_name)}">
          <div class="info">
            <div class="name">${escapeHTML(p.product_name)}</div>
            <div class="price">${formatPrice(p.price)}</div>
            <div class="meta">${escapeHTML(p.category_name)} &middot; ${escapeHTML(p.seller_name)}</div>
          </div>
        </a>
      </div>`;
  }

  async function loadProducts() {
    grid.innerHTML = '<p class="text-muted">Loading...</p>';
    try {
      let url = '/products?page=1';
      if (activeCategory) url += '&category_id=' + encodeURIComponent(activeCategory);
      const data = await api(url);
      const list = data.products.slice(0, 8);
      grid.innerHTML = list.length
        ? list.map(productCard).join('')
        : '<p class="text-muted">No products in this category yet.</p>';
    } catch (err) {
      grid.innerHTML = '';
      showMessage('msg', err.message);
    }
  }

  function drawChips(categories) {
    const chips = [{ category_id: '', category_name: 'All' }].concat(categories);
    catBox.innerHTML = chips.map((c) => `
      <button type="button" class="btn btn-sm ${String(c.category_id) === String(activeCategory) ? '' : 'btn-outline'}"
              data-id="${c.category_id}">${escapeHTML(c.category_name)}</button>`).join('');
  }

  async function loadCategories() {
    try {
      const data = await api('/categories');
      drawChips(data.categories);
      catBox.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-id]');
        if (!btn) return;
        activeCategory = btn.dataset.id;
        drawChips(data.categories);
        loadProducts();
      });
    } catch (err) {
      catBox.innerHTML = '';
    }
  }

  loadCategories();
  loadProducts();
})();
