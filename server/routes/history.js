// routes/history.js
const express = require("express");
const router = express.Router();
const db = require("../db/db");

router.get("/:evmAddress", async (req, res) => {
    try {
      const { evmAddress } = req.params;
      const { rows } = await db.query(
        `SELECT * FROM user_transactions WHERE user_address = $1 ORDER BY created_at DESC`,
        [evmAddress]
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });
  module.exports = router;
