// middleware/logger.js
// Reusable activity logging helper – writes to system_logs table.
// Matches the signature of the inline logAction used in routes/auth.js.
// Person A may optionally replace their inline helper by requiring this module.

const db = require('../config/db');

/**
 * Log a user action to system_logs.
 * Errors are caught internally so logging failures never crash a request.
 *
 * @param {number|null} userId  - The user performing the action (null for anonymous)
 * @param {string}      action  - Short action code, e.g. 'PRODUCT_CREATE'
 * @param {string}      description - Human-readable description
 * @param {string}      ip      - IP address from req.ip
 */
async function logAction(userId, action, description, ip) {
  try {
    await db.query(
      'INSERT INTO system_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
      [userId || null, action, description, ip || null]
    );
  } catch (e) {
    // Never propagate logging errors – they must not crash the main request
    console.error('[logger] Failed to write log:', e.message);
  }
}

module.exports = { logAction };
