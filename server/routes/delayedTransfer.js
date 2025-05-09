const express = require("express");
const router = express.Router();
const db = require("../db/db");
const { updateUserBalance, deductUserBalance } = require("../services/balanceServices");

// ✅ Schedule a delayed transfer
router.post("/", async (req, res) => {
  try {
    const { sender, recipient, token, amount, delayMinutes, isEvm } = req.body;

    if (!sender || !recipient || !token || !amount || !delayMinutes) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const now = new Date();
    const executeAt = new Date(now.getTime() + delayMinutes * 60000);

    // 🛡️ Lock balance
    await deductUserBalance(sender, token, amount);

    await db.query(
      `INSERT INTO user_delayed_transfers 
       (sender, recipient, token, amount, execute_at, is_evm, status) 
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
      [sender, recipient, token, amount, executeAt, isEvm]
    );

    res.json({ success: true, executeAt });
  } catch (err) {
    console.error("Error scheduling delayed transfer:", err.message);
    res.status(500).json({ error: "Failed to schedule transfer" });
  }
});

// ✅ Retrieve/cancel a pending transfer
router.post("/retrieve", async (req, res) => {
  try {
    const { sender, transferId } = req.body;

    const { rows } = await db.query(
      `SELECT * FROM user_delayed_transfers WHERE id = $1 AND sender = $2 AND status = 'pending'`,
      [transferId, sender]
    );

    const transfer = rows[0];
    if (!transfer) {
      return res.status(404).json({ error: "Transfer not found or already processed" });
    }

    await updateUserBalance(sender, transfer.token, transfer.amount);

    await db.query(
      `UPDATE user_delayed_transfers SET status = 'retrieved' WHERE id = $1`,
      [transferId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error retrieving transfer:", err.message);
    res.status(500).json({ error: "Failed to retrieve transfer" });
  }
});

// ✅ List all pending transfers for a user
router.get("/:evmAddress", async (req, res) => {
  try {
    const { evmAddress } = req.params;
    const { rows } = await db.query(
      `SELECT * FROM user_delayed_transfers 
       WHERE sender = $1 AND status = 'pending' 
       ORDER BY execute_at ASC`,
      [evmAddress]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching delayed transfers:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
