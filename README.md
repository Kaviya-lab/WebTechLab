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



## 3. Build the database first

Create the database

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

      
