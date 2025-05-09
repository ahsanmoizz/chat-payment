// superadminRoutes.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');


// Configure your PostgreSQL connection. Adjust as needed.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Middleware to check if the user is superadmin.
// Assumes that your authentication middleware sets req.user (e.g., from a JWT).
function checkSuperAdmin(req, res, next) {
  if (req.user && req.user.role === 'superadmin') {
    return next();
  }
  return res.status(403).json({ error: 'Insufficient privileges' });
}

// Endpoint: Retrieve full user list
router.get('/allUsers', checkSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Endpoint: Block or unblock a user
router.post('/blockUser', checkSuperAdmin, async (req, res) => {
  const { userId, block } = req.body;
  try {
    await pool.query('UPDATE users SET blocked = $1 WHERE id = $2', [block, userId]);
    res.json({ message: `User ${block ? 'blocked' : 'unblocked'} successfully` });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Endpoint: Change user role
router.post('/assignRole', checkSuperAdmin, async (req, res) => {
  const { email, role } = req.body;
  try {
    // Check if user exists
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in the system' });
    }
    

    // User exists, update role
    await pool.query('UPDATE users SET role = $1 WHERE email = $2', [role, email]);
    res.json({ message: 'User role updated successfully' });

  } catch (error) {
    console.error('Error assigning role:', error);
    res.status(500).json({ error: 'Failed to update or create user' });
  }
});


// Global flag for application status
let appDisabled = false;

// Middleware to check app status (apply to your main app routes)
function checkAppStatus(req, res, next) {
  if (appDisabled) {
    return res.status(503).json({ error: 'App is currently disabled' });
  }
  next();
}
// (Make sure you use checkAppStatus in your main Express app if desired.)

// Endpoint: Toggle entire app’s operational status
router.post('/toggleApp', checkSuperAdmin, (req, res) => {
  appDisabled = req.body.disable;
  res.json({ message: `App has been ${appDisabled ? 'disabled' : 'enabled'}` });
});
module.exports = {
  router,
  checkAppStatus, // ✅ Export the middleware
};

