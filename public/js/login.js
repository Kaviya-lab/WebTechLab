(() => {
  'use strict';

  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const passwordToggle = document.getElementById('password-toggle');
  const submitButton = document.getElementById('login-submit');
  const submitLabel = document.getElementById('submit-label');
  const submitSpinner = document.getElementById('submit-spinner');
  const errorBox = document.getElementById('login-error');

  let isSubmitting = false;

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.hidden = true;
  }

  function setLoading(loading) {
    submitButton.disabled = loading;
    submitButton.setAttribute('aria-busy', String(loading));
    submitLabel.textContent = loading ? 'Signing in…' : 'Sign in';
    submitSpinner.hidden = !loading;
  }

  passwordToggle.addEventListener('click', () => {
    const showPassword = passwordInput.type === 'password';
    passwordInput.type = showPassword ? 'text' : 'password';
    passwordToggle.textContent = showPassword ? 'Hide' : 'Show';
    passwordToggle.setAttribute('aria-pressed', String(showPassword));
  });

  emailInput.addEventListener('input', clearError);
  passwordInput.addEventListener('input', clearError);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (isSubmitting) return;

    clearError();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email) {
      showError('Enter your email address.');
      emailInput.focus();
      return;
    }
    if (!emailInput.validity.valid) {
      showError('Enter a valid email address.');
      emailInput.focus();
      return;
    }
    if (!password) {
      showError('Enter your password.');
      passwordInput.focus();
      return;
    }

    isSubmitting = true;
    setLoading(true);

    try {
      // Remove stale session data without triggering logout's redirect.
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('name');

      const data = await api('/auth/login', {
        method: 'POST',
        body: { email, password }
      });

      if (data.success !== true) {
        showError(data.message || 'Unable to sign in. Please try again.');
        return;
      }

      if (data.role !== 'seller') {
        showError('This sign-in page is for seller accounts only.');
        return;
      }

      if (!data.token) {
        showError('The server response did not include a login token. Please try again.');
        return;
      }

      saveSession(data);
      window.location.href = '/seller-dashboard.html';
    } catch (error) {
      showError(error.message || 'Unable to sign in. Please try again.');
    } finally {
      isSubmitting = false;
      setLoading(false);
    }
  });
})();
