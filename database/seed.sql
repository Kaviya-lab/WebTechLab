-- =============================================================
-- Seed data for Online Marketplace
-- File: database/seed.sql
--
-- HOW TO APPLY (after schema.sql and changes_B.sql):
--   mysql -u root -p marketplace < database/seed.sql
--
-- Test login credentials (all accounts):
--   Password: password123
--
-- Uses INSERT IGNORE so re-running this file is safe.
-- =============================================================

USE marketplace;

-- =============================================================
-- USERS
-- Password hash for 'password123' (bcrypt, cost 10)
-- =============================================================

INSERT IGNORE INTO users (user_id, name, email, password, mobile, role, status) VALUES
-- Superadmin
(1, 'Super Admin',     'superadmin@marketplace.com', '$2b$10$JQQ3nlDyRxA9JdjwIEUP5umNvzDNYLJMDq4TI709m3ciFd8Ozkb1m', '9000000001', 'superadmin', 'active'),
-- Admin
(2, 'Admin User',      'admin@marketplace.com',      '$2b$10$JQQ3nlDyRxA9JdjwIEUP5umNvzDNYLJMDq4TI709m3ciFd8Ozkb1m', '9000000002', 'admin',      'active'),
-- Sellers
(3, 'TechZone Store',  'seller1@marketplace.com',    '$2b$10$JQQ3nlDyRxA9JdjwIEUP5umNvzDNYLJMDq4TI709m3ciFd8Ozkb1m', '9100000001', 'seller',     'active'),
(4, 'Fashion Hub',     'seller2@marketplace.com',    '$2b$10$JQQ3nlDyRxA9JdjwIEUP5umNvzDNYLJMDq4TI709m3ciFd8Ozkb1m', '9100000002', 'seller',     'active'),
(5, 'BookWorld',       'seller3@marketplace.com',    '$2b$10$JQQ3nlDyRxA9JdjwIEUP5umNvzDNYLJMDq4TI709m3ciFd8Ozkb1m', '9100000003', 'seller',     'active'),
-- Customers
(6, 'Priya Sharma',    'customer1@marketplace.com',  '$2b$10$JQQ3nlDyRxA9JdjwIEUP5umNvzDNYLJMDq4TI709m3ciFd8Ozkb1m', '9200000001', 'customer',   'active'),
(7, 'Rahul Mehta',     'customer2@marketplace.com',  '$2b$10$JQQ3nlDyRxA9JdjwIEUP5umNvzDNYLJMDq4TI709m3ciFd8Ozkb1m', '9200000002', 'customer',   'active'),
(8, 'Anita Singh',     'customer3@marketplace.com',  '$2b$10$JQQ3nlDyRxA9JdjwIEUP5umNvzDNYLJMDq4TI709m3ciFd8Ozkb1m', '9200000003', 'customer',   'active'),
(9, 'Arjun Kumar',     'customer4@marketplace.com',  '$2b$10$JQQ3nlDyRxA9JdjwIEUP5umNvzDNYLJMDq4TI709m3ciFd8Ozkb1m', '9200000004', 'customer',   'active');

-- =============================================================
-- ADDRESSES (one per customer)
-- =============================================================

INSERT IGNORE INTO addresses (user_id, address_line, city, state, pincode) VALUES
(6, '12 MG Road, Apartment 3B',     'Bengaluru',  'Karnataka',    '560001'),
(7, '45 Park Street, 2nd Floor',     'Mumbai',     'Maharashtra',  '400001'),
(8, '7 Anna Nagar, Block C',         'Chennai',    'Tamil Nadu',   '600040'),
(9, '88 Civil Lines, Near Clock Twr','Delhi',      'Delhi',        '110054');

-- =============================================================
-- CARTS (one per customer — mirrors what auth.js does on register)
-- =============================================================

INSERT IGNORE INTO cart (customer_id) VALUES (6), (7), (8), (9);

-- =============================================================
-- CATEGORIES
-- =============================================================

INSERT IGNORE INTO categories (category_id, category_name, description, status) VALUES
(1,  'Electronics',            'Gadgets, devices and accessories',              'active'),
(2,  'Clothing & Fashion',     'Apparel, footwear and accessories',             'active'),
(3,  'Books',                  'Fiction, non-fiction, textbooks and more',      'active'),
(4,  'Home & Kitchen',         'Furniture, cookware and home essentials',       'active'),
(5,  'Sports & Fitness',       'Equipment, activewear and gym accessories',     'active'),
(6,  'Beauty & Personal Care', 'Skincare, haircare and grooming products',      'active'),
(7,  'Toys & Games',           'Toys for kids and board games for all ages',    'active'),
(8,  'Grocery & Food',         'Packaged foods, beverages and daily staples',   'active');

-- =============================================================
-- PRODUCTS
-- seller 3 → TechZone Store   (user_id 3)
-- seller 4 → Fashion Hub      (user_id 4)
-- seller 5 → BookWorld        (user_id 5)
-- =============================================================

INSERT IGNORE INTO products
  (product_id, seller_id, category_id, product_name, description, price, stock_quantity, image, status)
VALUES
-- TechZone Store – Electronics
(1,  3, 1, 'Wireless Bluetooth Headphones',   'Over-ear noise-cancelling headphones with 30-hour battery life and deep bass.', 2499.00, 45, NULL, 'active'),
(2,  3, 1, 'Mechanical Gaming Keyboard',       'RGB backlit 87-key TKL keyboard with blue switches and anti-ghosting.',          3299.00, 30, NULL, 'active'),
(3,  3, 1, 'USB-C Fast Charger 65W',           'GaN technology charger compatible with laptops, tablets and smartphones.',        999.00,  80, NULL, 'active'),
(4,  3, 1, 'Portable Power Bank 20000mAh',    '20000mAh dual-port power bank with 18W quick charge support.',                  1799.00, 60, NULL, 'active'),
(5,  3, 1, 'Smart LED Desk Lamp',              'Touch-dimmer desk lamp with 5 colour temperatures and USB charging port.',        899.00,  55, NULL, 'active'),
(6,  3, 1, 'Wireless Gaming Mouse',            '7-button programmable wireless mouse with 16000 DPI optical sensor.',            1599.00, 40, NULL, 'active'),
(7,  3, 5, 'Smart Fitness Band',               'Tracks steps, heart rate, sleep and receives notifications. IP68 waterproof.',   1299.00, 70, NULL, 'active'),

-- Fashion Hub – Clothing & Fashion
(8,  4, 2, 'Men\'s Classic Polo T-Shirt',      '100% cotton polo in 6 colour options. Available in S, M, L, XL, XXL.',           599.00, 120, NULL, 'active'),
(9,  4, 2, 'Women\'s Floral Kurti',            'Rayon floral print kurti with 3/4 sleeves. Sizes XS to 3XL.',                    799.00,  90, NULL, 'active'),
(10, 4, 2, 'Casual Denim Jacket',              'Slim-fit denim jacket with spread collar. Unisex design. Sizes S-XXL.',          1999.00,  50, NULL, 'active'),
(11, 4, 2, 'Running Sports Shoes',             'Lightweight mesh upper with air-cushioned sole. Ideal for running and gym.',     2299.00,  65, NULL, 'active'),
(12, 4, 2, 'Canvas Tote Bag',                  'Eco-friendly heavy-canvas tote with inner zip pocket. 20L capacity.',             499.00, 100, NULL, 'active'),
(13, 4, 6, 'Aloe Vera Face Wash',              'Gentle daily cleanser with aloe vera and cucumber extract. 150ml.',               299.00, 150, NULL, 'active'),
(14, 4, 2, 'Formal Oxford Shirt',              'Easy-iron cotton blend formal shirt in solid colours. Button-down collar.',       1199.00,  75, NULL, 'active'),

-- BookWorld – Books & more
(15, 5, 3, 'The Alchemist – Paulo Coelho',     'International bestselling novel about following your dreams. Paperback edition.', 299.00, 200, NULL, 'active'),
(16, 5, 3, 'Atomic Habits – James Clear',      'Practical guide to building good habits and breaking bad ones. Paperback.',       449.00, 180, NULL, 'active'),
(17, 5, 3, 'Python Programming – 3rd Ed',      'Comprehensive beginner-to-advanced Python programming textbook.',                 799.00, 100, NULL, 'active'),
(18, 5, 3, 'Deep Work – Cal Newport',          'Rules for focused success in a distracted world. Paperback.',                     399.00, 140, NULL, 'active'),
(19, 5, 3, 'Ikigai – Francesc Miralles',       'Japanese secret to a long and happy life. Translated edition.',                   349.00, 160, NULL, 'active'),
(20, 5, 4, 'Bamboo Laptop Stand',              'Foldable eco-friendly bamboo laptop stand for 11–17 inch laptops.',              1099.00,  40, NULL, 'active'),
(21, 5, 7, 'Wooden Chess Set – Classic',       'Handcrafted wooden chess board with weighted pieces in a storage box.',          1499.00,  35, NULL, 'active'),
(22, 3, 1, 'Webcam HD 1080p',                  'Full HD USB webcam with built-in microphone and auto-focus. Plug-and-play.',     1399.00,  50, NULL, 'active');

-- =============================================================
-- SAMPLE ORDERS (to demonstrate fulfillment tracking)
-- =============================================================

INSERT IGNORE INTO orders
  (order_id, customer_id, total_amount, shipping_address, order_status, payment_status)
VALUES
(1, 6, 5798.00, '12 MG Road, Apartment 3B, Bengaluru, Karnataka 560001', 'shipped',  'paid'),
(2, 7, 1248.00, '45 Park Street, 2nd Floor, Mumbai, Maharashtra 400001',  'pending',  'paid'),
(3, 8, 2797.00, '7 Anna Nagar, Block C, Chennai, Tamil Nadu 600040',       'delivered','paid');

-- Order 1: customer Priya buys headphones (TechZone) + book (BookWorld)
INSERT IGNORE INTO order_items
  (order_item_id, order_id, product_id, seller_id, quantity, price, subtotal, item_status)
VALUES
(1, 1, 1,  3, 1, 2499.00, 2499.00, 'shipped'),   -- Headphones – TechZone / shipped
(2, 1, 15, 5, 1,  299.00,  299.00, 'pending'),   -- Alchemist – BookWorld / still pending
(3, 1, 8,  4, 3,  999.00, 3000.00, 'shipped');   -- wait, let's correct the total...

-- Fix: let's keep order totals consistent with what's inserted
UPDATE orders SET total_amount = (
  SELECT SUM(subtotal) FROM order_items WHERE order_id = 1
) WHERE order_id = 1;

-- Order 2: Rahul buys two books
INSERT IGNORE INTO order_items
  (order_item_id, order_id, product_id, seller_id, quantity, price, subtotal, item_status)
VALUES
(4, 2, 16, 5, 1, 449.00,  449.00, 'pending'),  -- Atomic Habits
(5, 2, 19, 5, 1, 349.00,  349.00, 'pending'),  -- Ikigai
(6, 2, 13, 4, 1, 299.00,  299.00, 'pending');  -- Face Wash

UPDATE orders SET total_amount = (
  SELECT SUM(subtotal) FROM order_items WHERE order_id = 2
) WHERE order_id = 2;

-- Order 3: Anita buys keyboard + shirt
INSERT IGNORE INTO order_items
  (order_item_id, order_id, product_id, seller_id, quantity, price, subtotal, item_status)
VALUES
(7, 3, 2,  3, 1, 3299.00, 3299.00, 'delivered'),  -- Keyboard – TechZone
(8, 3, 14, 4, 1, 1199.00, 1199.00, 'delivered');  -- Oxford Shirt – Fashion Hub

UPDATE orders SET total_amount = (
  SELECT SUM(subtotal) FROM order_items WHERE order_id = 3
) WHERE order_id = 3;
