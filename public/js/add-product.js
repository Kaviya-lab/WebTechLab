// public/js/add-product.js – Create / Edit product form logic

(function () {
  'use strict';

  const form = document.getElementById('product-form');
  const pageTitle = document.getElementById('page-title');
  const submitBtn = document.getElementById('submit-btn');
  const loading = document.getElementById('loading');
  const catSelect = document.getElementById('category_id');
  const imgInput = document.getElementById('image');
  const imgPreview = document.getElementById('img-preview');
  const statusGroup = document.getElementById('status-group');

  let editId = null; // null = create mode; number = edit mode

  // ── Image preview ───────────────────────────────────────────────────────────
  imgInput.addEventListener('change', () => {
    const file = imgInput.files[0];
    if (file && file.type.startsWith('image/')) {
      imgPreview.src = URL.createObjectURL(file);
      imgPreview.style.display = 'block';
    } else {
      imgPreview.style.display = 'none';
    }
  });

  // ── Load categories ─────────────────────────────────────────────────────────
  async function loadCategories(selectedId) {
    try {
      const data = await api('/categories');
      data.categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.category_id;
        opt.textContent = cat.category_name;
        if (selectedId && String(cat.category_id) === String(selectedId)) {
          opt.selected = true;
        }
        catSelect.appendChild(opt);
      });
    } catch (err) {
      showMessage('msg', 'Could not load categories: ' + err.message, 'error');
    }
  }

  // ── Edit mode: pre-fill form ────────────────────────────────────────────────
  async function loadProduct(id) {
    loading.classList.remove('hidden');
    try {
      const data = await api(`/products/${id}`);
      loading.classList.add('hidden');

      const p = data.product;

      document.getElementById('product_name').value   = p.product_name || '';
      document.getElementById('price').value          = p.price || '';
      document.getElementById('stock_quantity').value = p.stock_quantity || 0;
      document.getElementById('description').value    = p.description || '';

      await loadCategories(p.category_id);
      document.getElementById('status').value = p.status || 'active';

      // Show existing image preview
      if (p.image) {
        imgPreview.src = `/uploads/${escapeHTML(p.image)}`;
        imgPreview.style.display = 'block';
      }

      statusGroup.style.display = 'block'; // show status in edit mode
    } catch (err) {
      loading.classList.add('hidden');
      showMessage('msg', err.message, 'error');
    }
  }

  // ── Validate form fields ────────────────────────────────────────────────────
  function validate() {
    clearFieldErrors(form);
    let ok = true;

    const name = document.getElementById('product_name').value.trim();
    const price = document.getElementById('price').value;
    const cat = document.getElementById('category_id').value;
    const stock = document.getElementById('stock_quantity').value;

    if (!name) {
      setFieldError('product_name', 'Product name is required');
      ok = false;
    }
    if (!cat) {
      setFieldError('category_id', 'Please select a category');
      ok = false;
    }
    if (price === '' || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      setFieldError('price', 'Enter a valid price (≥ 0)');
      ok = false;
    }
    if (stock !== '' && (isNaN(parseInt(stock, 10)) || parseInt(stock, 10) < 0)) {
      setFieldError('stock_quantity', 'Stock must be 0 or more');
      ok = false;
    }

    return ok;
  }

  // ── Submit handler ──────────────────────────────────────────────────────────
  form.addEventListener('submit', async e => {
    e.preventDefault();
    clearMessage('msg');

    if (!validate()) return;

    const fd = new FormData(form);

    submitBtn.disabled = true;
    submitBtn.textContent = editId ? 'Saving…' : 'Creating…';

    try {
      if (editId) {
        await api(`/products/${editId}`, { method: 'PUT', body: fd });
        showMessage('msg', 'Product updated successfully!', 'success');
      } else {
        await api('/products', { method: 'POST', body: fd });
        showMessage('msg', 'Product created successfully!', 'success');
        form.reset();
        imgPreview.style.display = 'none';
      }
      // Brief delay then redirect
      setTimeout(() => { window.location.href = '/seller-products.html'; }, 1200);
    } catch (err) {
      showMessage('msg', err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = editId ? 'Save Changes' : 'Create Product';
    }
  });

  // ── Init ────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    if (!requireRole('seller')) return;

    editId = getQueryParam('edit');

    if (editId) {
      pageTitle.textContent = 'Edit Product';
      submitBtn.textContent = 'Save Changes';
      await loadProduct(editId);
    } else {
      await loadCategories(null);
    }
  });
})();
