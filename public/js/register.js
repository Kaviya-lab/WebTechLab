(function () {
  const existing = getUser();
  if (existing) {
    redirectToDashboard(existing.role);
    return;
  }

  const form = document.getElementById('register-form');
  const btn = document.getElementById('register-btn');
  const roleSelect = document.getElementById('role');
  const hint = document.getElementById('role-hint');

  function updateHint() {
    hint.textContent = roleSelect.value === 'seller'
      ? 'Seller accounts must be approved by an admin before you can log in.'
      : '';
  }
  roleSelect.addEventListener('change', updateHint);
  updateHint();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    clearMessage('msg');

    const role = roleSelect.value;
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const mobile = document.getElementById('mobile').value.trim();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm').value;

    let valid = true;
    if (!['customer', 'seller'].includes(role)) {
      setFieldError('role', 'Choose customer or seller');
      valid = false;
    }
    if (name.length < 2) {
      setFieldError('name', 'Name must be at least 2 characters');
      valid = false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setFieldError('email', 'Enter a valid email address');
      valid = false;
    }
    if (!/^\d{10}$/.test(mobile)) {
      setFieldError('mobile', 'Mobile number must be exactly 10 digits');
      valid = false;
    }
    if (password.length < 6) {
      setFieldError('password', 'Password must be at least 6 characters');
      valid = false;
    }
    if (confirm !== password) {
      setFieldError('confirm', 'Passwords do not match');
      valid = false;
    }
    if (!valid) return;

    btn.disabled = true;
    btn.textContent = 'Registering...';
    try {
      const res = await api('/auth/register', {
        method: 'POST',
        body: { name, email, password, mobile, role }
      });
      form.reset();
      updateHint();
      showMessage('msg', res.message, 'success');
      if (role === 'customer') {
        setTimeout(() => { window.location.href = '/login.html'; }, 1500);
      } else {
        btn.disabled = false;
      }
    } catch (err) {
      if (err.status === 409) setFieldError('email', err.message);
      showMessage('msg', err.message, 'error');
      btn.disabled = false;
    }
    btn.textContent = 'Register';
  });
})();
