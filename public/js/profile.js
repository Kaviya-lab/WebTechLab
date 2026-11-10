const profileUser = requireRole('customer', 'seller');
if (profileUser) {
  const profileForm = document.getElementById('profile-form');
  const passwordForm = document.getElementById('password-form');
  const isCustomer = profileUser.role === 'customer';

  // Only customers have a shipping address
  if (!isCustomer) document.getElementById('address-section').classList.add('hidden');

  async function loadProfile() {
    try {
      const data = await api('/profile');
      document.getElementById('name').value = data.user.name;
      document.getElementById('email').value = data.user.email;
      document.getElementById('mobile').value = data.user.mobile || '';
      if (isCustomer && data.address) {
        document.getElementById('address_line').value = data.address.address_line;
        document.getElementById('city').value = data.address.city || '';
        document.getElementById('state').value = data.address.state || '';
        document.getElementById('pincode').value = data.address.pincode || '';
      }
    } catch (err) {
      showMessage('msg', err.message);
    }
  }

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(profileForm);
    clearMessage('msg');

    const name = document.getElementById('name').value.trim();
    const mobile = document.getElementById('mobile').value.trim();
    const body = { name, mobile };

    let valid = true;
    if (name.length < 2) { setFieldError('name', 'Name must be at least 2 characters'); valid = false; }
    if (mobile && !/^\d{10}$/.test(mobile)) { setFieldError('mobile', 'Mobile number must be 10 digits'); valid = false; }

    if (isCustomer) {
      const address = {
        address_line: document.getElementById('address_line').value.trim(),
        city: document.getElementById('city').value.trim(),
        state: document.getElementById('state').value.trim(),
        pincode: document.getElementById('pincode').value.trim()
      };
      // The address is optional, but if any part is filled, all of it must be valid
      if (Object.values(address).some((v) => v !== '')) {
        if (address.address_line.length < 3) { setFieldError('address_line', 'Enter your address'); valid = false; }
        if (!address.city) { setFieldError('city', 'City is required'); valid = false; }
        if (!address.state) { setFieldError('state', 'State is required'); valid = false; }
        if (!/^\d{6}$/.test(address.pincode)) { setFieldError('pincode', 'Pincode must be 6 digits'); valid = false; }
        body.address = address;
      }
    }
    if (!valid) return;

    try {
      const res = await api('/profile', { method: 'PUT', body });
      localStorage.setItem('name', res.name);   // keep the navbar name in sync
      renderNavbar();
      showMessage('msg', res.message, 'success');
    } catch (err) {
      showMessage('msg', err.message);
    }
  });

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(passwordForm);
    clearMessage('msg');

    const old_password = document.getElementById('old_password').value;
    const new_password = document.getElementById('new_password').value;
    const confirm = document.getElementById('confirm_password').value;

    let valid = true;
    if (!old_password) { setFieldError('old_password', 'Enter your current password'); valid = false; }
    if (new_password.length < 6) { setFieldError('new_password', 'New password must be at least 6 characters'); valid = false; }
    if (confirm !== new_password) { setFieldError('confirm_password', 'Passwords do not match'); valid = false; }
    if (!valid) return;

    try {
      const res = await api('/profile/password', { method: 'PUT', body: { old_password, new_password } });
      passwordForm.reset();
      showMessage('msg', res.message, 'success');
    } catch (err) {
      if (/current password/i.test(err.message)) setFieldError('old_password', err.message);
      showMessage('msg', err.message);
    }
  });

  loadProfile();
}
