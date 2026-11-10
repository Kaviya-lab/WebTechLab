require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- API routes ----------
// mount(prefix, file): mounts a route file only if it exports a real router.
// An empty or unfinished file is skipped (so it cannot crash the server),
// and it starts working automatically once the file has real code.
function mount(prefix, file) {
  let router;
  try {
    router = require(file);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && err.message.includes(file)) {
      console.log(`[routes] ${prefix} skipped (file ${file} not found)`);
      return;
    }
    throw err; // a real error inside the file: show it
  }
  if (typeof router !== 'function') {
    console.log(`[routes] ${prefix} skipped (${file} is empty / not built yet)`);
    return;
  }
  app.use(prefix, router);
}

mount('/api/auth', './routes/auth');
mount('/api/categories', './routes/categories');
mount('/api/products', './routes/products');
mount('/api/cart', './routes/cart');
mount('/api/orders', './routes/orders');              // customer: checkout, mine, cancel
mount('/api/orders', './routes/sellerOrders');        // seller: /seller, /items/:id/status
mount('/api/admin/orders', './routes/adminOrders');   // admin: order monitoring
mount('/api/seller-reports', './routes/sellerReports');
mount('/api/profile', './routes/profile');
mount('/api/customers', './routes/customers');
mount('/api/sellers', './routes/sellers');
mount('/api/admins', './routes/admins');
mount('/api/reports', './routes/reports');
mount('/api/logs', './routes/logs');
mount('/api/settings', './routes/settings');

// Unknown API route -> clean JSON 404 (must stay AFTER all routes above)
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

// Global error handler (must be last)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
db.query('SELECT 1')
  .then(() => console.log('MySQL connected'))
  .catch((err) => console.error('MySQL connection failed:', err.message));

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
