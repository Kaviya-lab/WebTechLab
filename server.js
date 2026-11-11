require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mount a route only when its file exports a valid Express router.
// Missing route files are skipped; genuine errors inside route files are rethrown.
function mount(prefix, file) {
  let router;

  try {
    router = require(file);
  } catch (err) {
    if (
      err.code === 'MODULE_NOT_FOUND' &&
      err.message.includes(file)
    ) {
      console.log(`[routes] ${prefix} skipped (file ${file} not found)`);
      return;
    }

    throw err;
  }

  if (typeof router !== 'function') {
    console.log(`[routes] ${prefix} skipped (${file} is not an Express router)`);
    return;
  }

  app.use(prefix, router);
}

// Shared authentication and marketplace routes.
mount('/api/auth', './routes/auth');
mount('/api/categories', './routes/categories');
mount('/api/products', './routes/products');
mount('/api/cart', './routes/cart');
mount('/api/orders', './routes/orders');
mount('/api/orders', './routes/sellerOrders');

// Admin order monitoring.
mount('/api/admin/orders', './routes/adminOrders');

// Seller and account routes.
mount('/api/seller-reports', './routes/sellerReports');
mount('/api/profile', './routes/profile');
mount('/api/customers', './routes/customers');
mount('/api/sellers', './routes/sellers');

// Admin and system routes.
mount('/api/admins', './routes/admins');
mount('/api/reports', './routes/reports');
mount('/api/logs', './routes/logs');
mount('/api/settings', './routes/settings');

// Unknown API route -> JSON 404.
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found'
  });
});

// Global error handler must remain last.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

const PORT = process.env.PORT || 3000;

db.query('SELECT 1')
  .then(() => console.log('MySQL connected'))
  .catch(err => console.error('MySQL connection failed:', err.message));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
