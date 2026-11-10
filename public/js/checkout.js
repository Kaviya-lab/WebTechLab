if (requireRole('customer')) {
  const form = document.getElementById('checkout-form');
  const placeBtn = document.getElementById('place-btn');
  let profile = null;
  let hadSavedAddress = false;

  async function loadSummary() {
    const summary = document.getElementById('summary');
    try {
      const data = await api('/cart');
      if (data.items.length === 0) {
        document.getElementById('checkout-area').classList.add('hidden');
        showMessage('msg', 'Your cart is empty. Add some products first.', 'info');
        return;
      }
      summary.innerHTML = `
        <div class="table-wrap"><table>
          <tr><th>Product</th><th>Qty</th><th>Subtotal</th></tr>
          ${data.items.map((i) => `
            <tr><td>${escapeHTML(i.product_name)}</td><td>${i.quantity}</td><td>${formatPrice(i.subtotal)}</td></tr>`).join('')}
        </table></div>
        <h3 class="mt">Total: ${formatPrice(data.total)}</h3>`;
      placeBtn.disabled = false;
    } catch (err) {
      showMessage('msg', err.message);
    }
  }

  // Pre-fill the form with the saved address
  async function loadProfile() {
    try {
      const data = await api('/profile');
      profile = data.user;
      if (data.address) {
        hadSavedAddress = true;
        document.getElementById('address_line').value = data.address.address_line;
        document.getElementById('city').value = data.address.city || '';
        document.getElementById('state').value = data.address.state || '';
        document.getElementById('pincode').value = data.address.pincode || '';
      } else {
        document.getElementById('save-address').checked = true;
      }
    } catch (err) {
      /* the form still works without prefill */
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    clearMessage('msg');

    const address = {
      address_line: document.getElementById('address_line').value.trim(),
      city: document.getElementById('city').value.trim(),
      state: document.getElementById('state').value.trim(),
      pincode: document.getElementById('pincode').value.trim()
    };

    let valid = true;
    if (address.address_line.length < 3) { setFieldError('address_line', 'Enter your address'); valid = false; }
    if (!address.city) { setFieldError('city', 'City is required'); valid = false; }
    if (!address.state) { setFieldError('state', 'State is required'); valid = false; }
    if (!/^\d{6}$/.test(address.pincode)) { setFieldError('pincode', 'Pincode must be 6 digits'); valid = false; }
    if (!valid) return;

    const shipping_address = `${address.address_line}, ${address.city}, ${address.state} - ${address.pincode}`;
    placeBtn.disabled = true;
    placeBtn.textContent = 'Placing order...';
    try {
      const res = await api('/orders', { method: 'POST', body: { shipping_address } });

      if (document.getElementById('save-address').checked && profile) {
        try {
          await api('/profile', { method: 'PUT', body: { name: profile.name, mobile: profile.mobile || '', address } });
        } catch (e2) { /* saving the address is optional */ }
      }

      document.getElementById('checkout-area').classList.add('hidden');
      const ok = document.getElementById('success');
      ok.classList.remove('hidden');
      ok.innerHTML = `
        <h2>Order placed successfully!</h2>
        <p>Your order id is <strong>#${res.order_id}</strong></p>
        <p>Total: <strong>${formatPrice(res.total_amount)}</strong></p>
        <p class="mt"><a class="btn" href="/my-orders.html">View my orders</a>
        <a class="btn btn-outline" href="/products.html">Continue shopping</a></p>`;
    } catch (err) {
      showMessage('msg', err.message, 'error');
      placeBtn.disabled = false;
      placeBtn.textContent = 'Place order';
    }
  });

  loadSummary();
  loadProfile();
}
