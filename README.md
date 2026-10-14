# Online Marketplace Web Application

This is our Web Technology assignment. It's an online marketplace where customers buy things, sellers list products, admins keep things in order, and a super admin controls the admins.

Stack: HTML/CSS, JavaScript (DOM + Fetch), Node.js with Express, and MySQL.

This README is basically our to-do list. If we follow it top to bottom, we should end up with a finished project that covers everything in the assignment PDF.


## 1. What we need installed first

- Node.js (LTS version) - check with `node -v`
- MySQL Server and MySQL Workbench (or phpMyAdmin if you prefer)
- VS Code
- Postman or Thunder Client (to test APIs before the frontend exists)
- Git, so we don't overwrite each other's work


## 2. Set up the project folder

Make a folder and start a Node project in it:

    mkdir online-marketplace
    cd online-marketplace
    npm init -y

Install the packages we'll need:

    npm install express mysql2 bcrypt jsonwebtoken dotenv cors multer
    npm install --save-dev nodemon

What each one is for:

- express: the web server and REST APIs
- mysql2: talks to MySQL
- bcrypt: hashes passwords (never store plain passwords)
- jsonwebtoken: login tokens
- dotenv: keeps DB password and secrets in a .env file
- cors: lets the frontend call the backend if they run on different ports
- multer: handles product image uploads
- nodemon: restarts the server automatically when we save

In package.json, add these under "scripts":

    "start": "node server.js",
    "dev": "nodemon server.js"

Suggested folder layout:

    online-marketplace/
      server.js
      .env
      .gitignore
      package.json
      config/
        db.js
      middleware/
        auth.js          (checks token)
        role.js          (checks role / permission)
        logger.js        (writes to system_logs)
      routes/
        auth.js
        products.js
        categories.js
        cart.js
        orders.js
        customers.js
        sellers.js
        admins.js
        reports.js
        logs.js
        settings.js
      database/
        schema.sql
        seed.sql
      public/
        css/style.css
        js/                (one js file per page, plus a shared api.js)
        uploads/           (product images)
        index.html
        login.html
        ... (all the other html pages)

Create a `.env` file:

    PORT=3000
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=yourpassword
    DB_NAME=marketplace
    JWT_SECRET=something_long_and_random

Add `.env`, `node_modules` and `public/uploads` to `.gitignore` so they don't get pushed.


## 3. Build the database first

Do this before any code. Everything else depends on it.

Create the database:

    CREATE DATABASE marketplace;
    USE marketplace;

Then create the tables in this order (parents before children, otherwise foreign keys will fail):

1. users
2. addresses
3. categories
4. products
5. cart
6. cart_items
7. orders
8. order_items
9. reviews
10. admin_permissions
11. system_logs

Here's the full schema we can paste into `database/schema.sql`:

    CREATE TABLE users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      mobile VARCHAR(15),
      role ENUM('customer','seller','admin','superadmin') NOT NULL,
      status ENUM('active','blocked','pending','rejected','inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE addresses (
      address_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      address_line VARCHAR(255) NOT NULL,
      city VARCHAR(100),
      state VARCHAR(100),
      pincode VARCHAR(10),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );

    CREATE TABLE categories (
      category_id INT AUTO_INCREMENT PRIMARY KEY,
      category_name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      status ENUM('active','inactive') DEFAULT 'active'
    );

    CREATE TABLE products (
      product_id INT AUTO_INCREMENT PRIMARY KEY,
      seller_id INT NOT NULL,
      category_id INT NOT NULL,
      product_name VARCHAR(200) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
      stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
      image VARCHAR(255),
      status ENUM('active','inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seller_id) REFERENCES users(user_id),
      FOREIGN KEY (category_id) REFERENCES categories(category_id)
    );

    CREATE TABLE cart (
      cart_id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES users(user_id) ON DELETE CASCADE
    );

    CREATE TABLE cart_items (
      cart_item_id INT AUTO_INCREMENT PRIMARY KEY,
      cart_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL CHECK (quantity > 0),
      price DECIMAL(10,2) NOT NULL,
      UNIQUE (cart_id, product_id),
      FOREIGN KEY (cart_id) REFERENCES cart(cart_id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
    );

    CREATE TABLE orders (
      order_id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      shipping_address VARCHAR(500) NOT NULL,
      order_status ENUM('pending','confirmed','shipped','delivered','cancelled') DEFAULT 'pending',
      payment_status ENUM('pending','paid','failed','refunded') DEFAULT 'pending',
      order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES users(user_id)
    );

    CREATE TABLE order_items (
      order_item_id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      seller_id INT NOT NULL,
      quantity INT NOT NULL CHECK (quantity > 0),
      price DECIMAL(10,2) NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(product_id),
      FOREIGN KEY (seller_id) REFERENCES users(user_id)
    );

    CREATE TABLE reviews (
      review_id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      product_id INT NOT NULL,
      rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
    );

    CREATE TABLE admin_permissions (
      permission_id INT AUTO_INCREMENT PRIMARY KEY,
      admin_id INT NOT NULL,
      permission_name VARCHAR(100) NOT NULL,
      UNIQUE (admin_id, permission_name),
      FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE
    );

    CREATE TABLE system_logs (
      log_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      action VARCHAR(100) NOT NULL,
      description TEXT,
      ip_address VARCHAR(45),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
    );

A couple of notes on the choices above:

- I added a few extra status values (pending, rejected, inactive) because sellers need approval, and admins can be activated/deactivated.
- order_items stores seller_id and price so that one order can have products from many sellers, and old orders keep the price they were bought at even if the product price changes later.
- A cart has one row per customer (customer_id is UNIQUE).

Next, make `database/seed.sql` with some starter data:

- One super admin account (we can't create it through the website because only a super admin can create admins, so we insert it by hand).
- A few categories (Electronics, Clothing, Books, Home).
- One test account for each role.
- A handful of products.

For the passwords in the seed file, run bcrypt once in a small node script and paste the hashed value into the SQL. Don't put plain text passwords in the database.


## 4. Build the backend

### Step 4.1 - Database connection (config/db.js)

Create a connection pool with mysql2 using the values from `.env`, and export it with promises so we can use async/await.

### Step 4.2 - Basic server (server.js)

- Load dotenv.
- Create the express app.
- Add `express.json()` and `cors()`.
- Serve the `public` folder as static files.
- Mount each route file, for example `app.use('/api/products', require('./routes/products'))`.
- Add one error-handling middleware at the end so crashes return a clean JSON error instead of a stack trace.
- Start listening on PORT.

Run `npm run dev` and make sure `http://localhost:3000` loads without errors before going further.

### Step 4.3 - Auth middleware (middleware/auth.js)

- Read the token from the `Authorization: Bearer <token>` header.
- Verify it with JWT_SECRET.
- Put the user's id and role on `req.user`.
- If anything is wrong, return 401.

### Step 4.4 - Role middleware (middleware/role.js)

- A function like `allowRoles('seller', 'admin', 'superadmin')` that returns 403 if `req.user.role` isn't in the list.
- A second function like `requirePermission('manage_customers')` for admins. Super admin always passes. For a normal admin, check the admin_permissions table.

This is the heart of the role-based access control the assignment asks for, so do it properly. Never trust the frontend to hide buttons. Every API must check the role on the server too.

### Step 4.5 - Logger (middleware/logger.js)

Write a helper `logAction(userId, action, description, ip)` that inserts into system_logs. Call it whenever something important happens: login, failed login, register, add/edit/delete product, place order, cancel order, block/unblock user, create/delete admin, change settings.

### Step 4.6 - Auth routes (routes/auth.js)

- POST /api/auth/register - customers and sellers only. Validate input, check the email isn't already used, hash the password, insert the user. Sellers start as `pending` until an admin approves them. Customers start as `active` and also get a row in the cart table.
- POST /api/auth/login - find user by email, compare password with bcrypt, refuse if status is blocked/pending/rejected/inactive (give a clear message for each), then return a JWT and the role.
- GET /api/auth/me - returns the logged-in user's details.

### Step 4.7 - Categories (routes/categories.js)

- GET /api/categories - public, active ones only.
- POST, PUT, DELETE - admin and super admin only.

### Step 4.8 - Products (routes/products.js)

- GET /api/products - public. Support query params: `search`, `category`, `minPrice`, `maxPrice`, `sort`, and `page`. Only show active products with active sellers.
- GET /api/products/:id - public, includes seller name, category and reviews.
- GET /api/products/mine - seller only, their own products.
- POST /api/products - seller (or admin/super admin). Use multer for the image. The seller_id comes from the token, not from the request body.
- PUT /api/products/:id - a seller can only edit their own; admins can edit any.
- DELETE /api/products/:id - same rule. If the product is already in old orders, mark it inactive instead of deleting it, or the foreign key will complain.
- PATCH /api/products/:id/stock - quick stock update for sellers.

### Step 4.9 - Cart (routes/cart.js) - customer only

- GET /api/cart - items with product name, price and quantity, plus a total.
- POST /api/cart - add a product (`product_id`, `quantity`). If it's already there, increase the quantity. Check stock.
- PUT /api/cart/:itemId - change quantity.
- DELETE /api/cart/:itemId - remove an item.

### Step 4.10 - Orders (routes/orders.js)

Customer:
- POST /api/orders - checkout. This is the trickiest one. Do it inside a database transaction:
  1. Get cart items.
  2. Re-check stock for each one.
  3. Insert into orders.
  4. Insert each item into order_items (with seller_id and subtotal).
  5. Reduce stock_quantity on each product.
  6. Empty the cart.
  7. Commit. If anything fails, rollback.
- GET /api/orders/mine - order history.
- PUT /api/orders/:id/cancel - only if status is pending or confirmed. Put the stock back.

Seller:
- GET /api/orders/seller - only the order_items that belong to this seller.
- PUT /api/orders/:id/status - seller can move it to confirmed, shipped, or delivered, but not mess with orders that aren't theirs.

Admin and super admin:
- GET /api/orders - all orders.
- PUT /api/orders/:id/status - any status.

### Step 4.11 - Customers and sellers management (admin side)

- GET /api/customers - list with `?search=`.
- PATCH /api/customers/:id/block and /unblock.
- GET /api/sellers - list, with status filter.
- PATCH /api/sellers/:id/approve, /reject, /block, /unblock.
- Log every one of these actions.

### Step 4.12 - Profile

- GET and PUT /api/profile - name, mobile, and the address (for customers). Allow password change with the old password required.

### Step 4.13 - Super admin routes (routes/admins.js)

- POST /api/admins - create an admin, hash password, and save the permissions list.
- GET /api/admins - list.
- PUT /api/admins/:id - update details and permissions.
- PATCH /api/admins/:id/status - activate/deactivate.
- DELETE /api/admins/:id.
- All of these are superadmin only.

Some permission names we can use: manage_customers, manage_sellers, manage_products, manage_categories, manage_orders, view_reports, view_logs.

### Step 4.14 - Reports (routes/reports.js)

- Seller: their own total sales, number of orders, top products, sales per day/month.
- Admin: marketplace totals, orders per status, top sellers, top categories.
- Super admin: the same as admin plus filters (date range, seller, category).

Use SQL with SUM, COUNT, GROUP BY and JOINs. Good chance to show off some SQL.

### Step 4.15 - Logs and settings

- GET /api/logs - super admin, with filters for user, action and date range. Admin gets a limited view if they have the permission.
- A simple `settings` approach: either create one more table (key, value) or keep a JSON file. Things like site name, tax percentage, maintenance mode. Super admin edits it, admin can only view some of it ("limited" in the permission table).

### Step 4.16 - Test every API in Postman

Before touching the frontend, test each endpoint with each role and also without a token. Check that a customer really gets a 403 when calling a seller endpoint. Fix bugs here, it's much easier than finding them later through the UI.


## 5. Build the frontend

### Step 5.1 - Shared pieces

- `css/style.css` - one stylesheet for the whole site: colours, buttons, forms, cards, tables, navbar, footer. Use flexbox/grid and media queries so it works on phones (the assignment wants a responsive interface).
- `js/api.js` - one helper file used by every page. It should:
  - wrap `fetch` so it automatically adds the token header,
  - parse JSON,
  - handle errors in one place (show a message, redirect to login on 401),
  - have helpers like `getUser()`, `logout()`, `requireRole('seller')`.
- A navbar that changes depending on who is logged in. Either copy it in every page or load it with a small JS function.

Where do we store the token? localStorage is fine for this assignment.

### Step 5.2 - Public pages

1. index.html - hero section, featured products, categories.
2. register.html - choose Customer or Seller, validate fields (email format, password length, mobile number, matching confirm password), show errors under each field.
3. login.html - after login, redirect by role:
   - customer -> customer-dashboard.html
   - seller -> seller-dashboard.html
   - admin -> admin-dashboard.html
   - superadmin -> superadmin-dashboard.html
4. products.html - search box, category dropdown, price range, sort. Fetch from `/api/products` with the query values and rebuild the product grid with the DOM, no page reload. Add pagination or a "load more" button.
5. product-details.html - read the id from the URL (`?id=5`), fetch the product, show the image, price, stock, seller, reviews, and an "Add to cart" button (only for customers).

### Step 5.3 - Customer pages

1. customer-dashboard.html - quick summary: recent orders, cart count.
2. cart.html - list items, + / - quantity buttons, remove button, live total. Every click calls the API and then updates the DOM.
3. checkout.html - pick or enter shipping address, show order summary, place order, show a success message with the order id.
4. my-orders.html - list of orders with status, expandable items, and a Cancel button that only shows for cancellable orders.
5. profile.html - edit name, mobile, address, and change password.

### Step 5.4 - Seller pages

1. seller-dashboard.html - cards for total products, low stock, pending orders, total sales.
2. seller-products.html - table of own products with edit, delete and a quick stock update.
3. add-product.html - form with image upload (use `FormData`, not JSON, for this one). The same page can be reused for editing by passing `?id=`.
4. seller-orders.html - orders containing their products, with a dropdown to change status.
5. seller-reports.html - sales summary, and a chart if we have time (Chart.js from a CDN is easy).

### Step 5.5 - Admin pages

1. admin-dashboard.html - totals for users, sellers, products, orders, and recent activity.
2. manage-customers.html - table with search, block/unblock buttons.
3. manage-sellers.html - table with approve/reject/block/unblock.
4. manage-products.html - view all products, edit or remove them.
5. manage-categories.html - add, edit, activate/deactivate categories.
6. admin-reports.html - marketplace reports.

Hide the menu items an admin doesn't have permission for (and remember the server blocks them anyway).

### Step 5.6 - Super admin pages

1. superadmin-dashboard.html - system overview.
2. manage-admins.html - create, edit, activate/deactivate, delete admins, and tick boxes for their permissions.
3. system-logs.html - table with filters (user, action, date range).
4. system-settings.html - form to edit settings.
5. Reports with filters (can live in the dashboard or its own page).

### Step 5.7 - Page protection

At the top of every protected page's JS, call `requireRole(...)`. If there's no token or the role doesn't match, redirect to login.html. Again, this is only for user experience. The real protection is on the server.


## 6. Validation and error handling

The assignment lists this as a minimum requirement, so don't leave it for the end.

Frontend:
- Check required fields, email format, password length, number ranges (price and stock can't be negative), file type and size for images.
- Show clear inline error messages instead of alert() popups.

Backend:
- Validate everything again. Never assume the frontend did its job.
- Use parameterized queries (`?` placeholders in mysql2) so SQL injection isn't possible.
- Return proper status codes: 400 bad input, 401 not logged in, 403 not allowed, 404 not found, 409 duplicate, 500 server error.
- Always return JSON like `{ "success": false, "message": "..." }`.


## 7. Minimum requirements checklist

Go through the assignment's list and tick each one off before submitting.

- [ ] Four roles with role-based access control
- [ ] MySQL database with primary keys, foreign keys and constraints
- [ ] Node.js backend with REST APIs
- [ ] AJAX/Fetch communication
- [ ] JavaScript DOM manipulation
- [ ] Login and authentication
- [ ] Product search and filtering
- [ ] Shopping cart and order processing
- [ ] Seller inventory management
- [ ] Admin management of customers, sellers, products and categories
- [ ] Super admin management of administrators
- [ ] Form validation and error handling
- [ ] Responsive interface
- [ ] System activity logging

(The PDF skips item 6 in its numbered list, so there's nothing to tick for that one. Might be worth asking the teacher if it was something specific.)


## 8. Suggested order to actually work in

If we're not sure where to start, this order keeps things working at every stage:

1. Install tools, create folder, install packages.
2. Create database, tables and seed data.
3. Server + DB connection working.
4. Register and login (backend, then pages).
5. Categories and products (backend, then products.html and product-details.html).
6. Seller add/edit/delete product pages.
7. Cart and checkout.
8. Orders for customers, then sellers, then admins.
9. Admin management pages.
10. Super admin pages: admins, permissions, logs, settings.
11. Reports.
12. Profile pages.
13. Validation clean-up, responsive fixes, bug fixing.
14. Final testing with all four roles.
15. Screenshots, final README edits, submit.


## 9. How to run the project

1. Clone or download the project.
2. Run `npm install`.
3. Open MySQL and run `database/schema.sql`, then `database/seed.sql`.
4. Copy `.env.example` to `.env` and fill in your MySQL details.
5. Run `npm start` (or `npm run dev`).
6. Open `http://localhost:3000` in the browser.




