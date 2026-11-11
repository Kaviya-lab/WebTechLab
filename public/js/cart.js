if (requireRole('customer')) {
  const box = document.getElementById('cart');

  function render(data) {
    const items = data.items;
    if (items.length === 0) {
      box.innerHTML = `
        <div class="card text-center">
          <p>Your cart is empty.</p>
          <p class="mt"><a class="btn" href="/products.html">Browse products</a></p>
        </div>`;
      return;
    }

    const rows = items.map((i) => `
      <tr>
        <td>
          <div class="flex">
            <img src="${productImage(i.image)}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:6px;">
            <div>
              <a href="/product-details.html?id=${i.product_id}">${escapeHTML(i.product_name)}</a>
              <div class="text-muted">Sold by ${escapeHTML(i.seller_name)}</div>
            </div>
          </div>
        </td>
        <td>${formatPrice(i.price)}</td>
        <td>
          <div class="flex">
            <button class="btn btn-outline btn-sm" data-action="qty" data-id="${i.cart_item_id}"
                    data-qty="${i.quantity - 1}" ${i.quantity <= 1 ? 'disabled' : ''}>-</button>
            <strong>${i.quantity}</strong>
            <button class="btn btn-outline btn-sm" data-action="qty" data-id="${i.cart_item_id}"
                    data-qty="${i.quantity + 1}" ${i.quantity >= i.stock_quantity ? 'disabled' : ''}>+</button>
          </div>
        </td>
        <td>${formatPrice(i.subtotal)}</td>
        <td><button class="btn btn-danger btn-sm" data-action="remove" data-id="${i.cart_item_id}">Remove</button></td>
      </tr>`).join('');

    box.innerHTML = `
      <div class="table-wrap">
        <table>
          <tr><th>Product</th><th>Price</th><th>Quantity</th><th>Subtotal</th><th></th></tr>
          ${rows}
        </table>
      </div>
      <div class="card mt flex" style="justify-content:space-between;">
        <h2 style="margin:0;">Total: <span id="cart-total">${formatPrice(data.total)}</span></h2>
        <a class="btn btn-success" href="/checkout.html">Proceed to checkout</a>
      </div>`;
  }

  async function loadCart() {
    try {
      render(await api('/cart'));
    } catch (err) {
      showMessage('msg', err.message);
    }
  }

  // One click handler for all + / - / remove buttons (event delegation)
  box.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    btn.disabled = true;
    clearMessage('msg');
    try {
      if (btn.dataset.action === 'remove') {
        await api(`/cart/${btn.dataset.id}`, { method: 'DELETE' });
      } else {
        await api(`/cart/${btn.dataset.id}`, { method: 'PUT', body: { quantity: Number(btn.dataset.qty) } });
      }
    } catch (err) {
      showMessage('msg', err.message);
    }
    loadCart();
  });

  loadCart();
}
