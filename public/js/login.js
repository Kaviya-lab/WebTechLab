(() => {
  'use strict';

  const existing = getUser();
  if (existing) {
    redirectToDashboard(existing.role);
    return;
  }

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
      const data = await api('/auth/login', {
        method: 'POST',
        body: { email, password }
      });

      if (!data.token || !data.role) {
        throw new Error('The server returned an incomplete login response.');
      }

      saveSession(data);
      redirectToDashboard(data.role);
    } catch (error) {
      showError(error.message || 'Unable to sign in. Please try again.');
    } finally {
      isSubmitting = false;
      setLoading(false);
    }
  });
})();
