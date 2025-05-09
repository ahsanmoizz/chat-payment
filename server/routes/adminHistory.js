// routes/adminHistory.js
const express = require("express");
const router = express.Router();
const db = require("../db/db");

// Admin gets all txs with optional filters
router.get("/all-transactions", async (req, res) => {
  try {
    const { type, source, user } = req.query;
    const queryParams = [];
    let query = "SELECT * FROM user_transactions WHERE 1=1";

    if (type) {
      queryParams.push(type);
      query += ` AND type = $${queryParams.length}`;
    }
    if (source) {
      queryParams.push(source);
      query += ` AND source = $${queryParams.length}`;
    }
    if (user) {
      queryParams.push(user);
      query += ` AND user_address = $${queryParams.length}`;
    }

    query += " ORDER BY created_at DESC LIMIT 200";
    const result = await db.query(query, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error("Admin tx fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch admin transactions" });
  }
});

module.exports = router;
