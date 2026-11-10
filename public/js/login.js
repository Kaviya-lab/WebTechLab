(function () {
  // Already logged in: go straight to the dashboard
  const existing = getUser();
  if (existing) {
    redirectToDashboard(existing.role);
    return;
  }

  const form = document.getElementById('login-form');
  const btn = document.getElementById('login-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    clearMessage('msg');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    let valid = true;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setFieldError('email', 'Enter a valid email address');
      valid = false;
    }
    if (!password) {
      setFieldError('password', 'Password is required');
      valid = false;
    }
    if (!valid) return;

    btn.disabled = true;
    btn.textContent = 'Logging in...';
    try {
      const res = await api('/auth/login', { method: 'POST', body: { email, password } });
      saveSession(res);
      redirectToDashboard(res.role);
    } catch (err) {
      showMessage('msg', err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Login';
    }
  });
})();
