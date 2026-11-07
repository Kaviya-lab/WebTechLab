require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function mountRoute(prefix, modulePath) {
  const route = require(modulePath);

  if (typeof route !== 'function') {
    console.warn(
      `[routes] Skipping ${modulePath} at ${prefix}: expected an Express middleware function`
    );
    return;
  }

  app.use(prefix, route);
}

mountRoute('/api/auth', './routes/auth');
mountRoute('/api/categories', './routes/categories');
mountRoute('/api/products', './routes/products');
mountRoute('/api/cart', './routes/cart');
mountRoute('/api/orders', './routes/orders');
mountRoute('/api/orders', './routes/sellerOrders');
mountRoute('/api/profile', './routes/profile');
mountRoute('/api/customers', './routes/customers');
mountRoute('/api/sellers', './routes/sellers');
mountRoute('/api/admins', './routes/admins');
mountRoute('/api/reports', './routes/reports');
mountRoute('/api/seller-reports', './routes/sellerReports');
mountRoute('/api/logs', './routes/logs');
mountRoute('/api/settings', './routes/settings');

// Unknown API route -> clean JSON 404
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
const db = require('./config/db');
db.query('SELECT 1')
  .then(() => console.log('MySQL connected'))
  .catch(err => console.error('MySQL connection failed:', err.message));

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
