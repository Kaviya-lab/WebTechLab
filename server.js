require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes (add more here as you build them)
app.use('/api/auth', require('./routes/auth'));

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
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/orders', require('./routes/sellerOrders'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/sellers', require('./routes/sellers'));
app.use('/api/admins', require('./routes/admins'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/seller-reports', require('./routes/sellerReports'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/settings', require('./routes/settings'));
