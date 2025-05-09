require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const Redis = require('ioredis');
const checkSubscription = require("./middleware/subscriptionGuard");

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const app = express();

const checkAppStatus = require("../routes/superAdminRoutes").checkAppStatus; // Import it

// Apply it globally before all protected routes
app.use("/api", checkAppStatus);


// Middleware: security headers via Helmet.
app.use(helmet());

// Middleware: rate limiting.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Import superadmin routes (ensure superAdminRoutes.js is in the same folder)
const superadminRoutes = require('../routes/superAdminRoutes');
app.use('/api/superadmin', superadminRoutes);

// Middleware: parse JSON.
app.use(express.json());

// Middleware: Configure CORS using an environment variable.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['https://yourproductiondomain.com'];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(new Error('Not allowed by CORS'));
      }
      return callback(null, true);
    },
  })
);
/*const allowedOrigins = process.env.ALLOWED_ORIGINS
? process.env.ALLOWED_ORIGINS.split(',')
: ['http://localhost:3000', 'https://yourproductiondomain.com'];

app.use(
cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
})
);
*/


// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// **Online Status Functions**
const updateUserOnlineStatus = async (userId) => {
  if (!userId) return;
  await redis.set(`user_status:${userId}`, 'online', 'EX', 300); // Expire in 5 minutes
};

const markUserOffline = async (userId) => {
  if (!userId) return;
  await redis.set(`user_status:${userId}`, 'offline', 'EX', 60 * 60); // Expire in 1 hour
};

// JWT authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;

    // Update online status on each request
    await updateUserOnlineStatus(user.id);
    
    setTimeout(async () => {
      await markUserOffline(user.id);
    }, 5 * 60 * 1000);

    next();
  });
};

// **GET /api/chats - Retrieve chats for the logged-in user with online status**
app.get('/api/chats', authenticateToken,checkSubscription, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT c.id, u.id AS chat_partner_id, u.name AS chat_partner, 
              u.profile_image, c.last_message, c.updated_at
       FROM chats c
       JOIN users u ON c.chat_partner = u.id
       WHERE c.user_id = $1
       ORDER BY c.updated_at DESC`,
      [userId]
    );

    // Fetch online status from Redis
    const chatsWithStatus = await Promise.all(
      result.rows.map(async (chat) => {
        const status = await redis.get(`user_status:${chat.chat_partner_id}`);
        return { ...chat, online: status === 'online' };
      })
    );

    res.json(chatsWithStatus);
  } catch (err) {
    console.error('Error fetching chats:', err);
    res.sendStatus(500);
  }
});

// **POST /api/chats - Post a new chat message**
app.post('/api/chats', authenticateToken,checkSubscription, async (req, res) => {
  try {
    const userId = req.user.id;
    const { chat_partner, message } = req.body;
    if (!chat_partner || !message) {
      return res.status(400).json({ error: 'chat_partner and message are required' });
    }
    const result = await pool.query(
      `INSERT INTO chats (user_id, chat_partner, last_message, updated_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, chat_partner, last_message, updated_at`,
      [userId, chat_partner, message]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error posting chat:', err);
    res.sendStatus(500);
  }
});

// **POST /api/checkContacts - Check which phone numbers are registered**
app.post('/api/checkContacts', authenticateToken, async (req, res) => {
  try {
    const { phoneNumbers } = req.body;
    if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
      return res.status(400).json({ error: 'Invalid phoneNumbers array.' });
    }
    const placeholders = phoneNumbers.map((_, i) => `$${i + 1}`).join(',');
    const sql = `SELECT id AS "userId", name, phone, profile_image 
                 FROM users 
                 WHERE phone IN (${placeholders})`;
    const result = await pool.query(sql, phoneNumbers);
    res.json(result.rows);
  } catch (err) {
    console.error('Error checking contacts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// **POST /api/groups - Create a new group chat**
app.post('/api/groups', authenticateToken,checkSubscription, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { groupName, groupIcon, memberIds, adminIds, onlyAdminCanMessage } = req.body;

    if (!groupName || !memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'Group name and at least one member are required' });
    }

    if (!memberIds.includes(adminId)) {
      memberIds.push(adminId);
    }

    let finalAdminIds = adminIds && Array.isArray(adminIds)
      ? adminIds.filter(id => memberIds.includes(id))
      : [adminId];

    const groupId = uuidv4();
    const result = await pool.query(
      `INSERT INTO groups (id, group_name, group_icon, admin_id, member_ids, admin_ids, only_admin_can_message, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [groupId, groupName, groupIcon, adminId, JSON.stringify(memberIds), JSON.stringify(finalAdminIds), onlyAdminCanMessage || false]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating group:', err);
    res.sendStatus(500);
  }
});

// **GET /api/groups - Retrieve all groups the logged-in user belongs to**
app.get('/api/groups', authenticateToken, checkSubscription,async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT * FROM groups
       WHERE member_ids::jsonb ? $1
       ORDER BY created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.sendStatus(500);
  }
});

// Start the server
const port = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

module.exports = app;
