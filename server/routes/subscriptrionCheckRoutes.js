// server/routes/subscriptionCheckRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../db/db");

router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const { rows } = await db.query(
      "SELECT subscription_expiry FROM users WHERE id = $1",
      [userId]
    );

    if (!rows[0]) return res.status(404).json({ error: "User not found" });

    const isExpired = new Date(rows[0].subscription_expiry) < new Date();

    res.json({ isExpired });
  } catch (err) {
    console.error("Check subscription error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
