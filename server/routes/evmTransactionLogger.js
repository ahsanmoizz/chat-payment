// routes/evmTxLogger.js
const express = require("express");
const router = express.Router();
const recordTransaction = require("../utils/recordTransaction");
const { updateUserBalance } = require("../services/balanceServices");

// POST /api/evm-tx-log
router.post("/", async (req, res) => {
  try {
    const {
      userAddress,
      direction, // 'deposit' | 'withdraw' | 'transfer'
      token,
      amount,
      txHash,
      ip,
      source = "internal"
    } = req.body;

    if (!userAddress || !direction || !token || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ Update balance
    await updateUserBalance(userAddress, token, amount);

    // ✅ Record transaction
    await recordTransaction({
      userAddress,
      type: "EVM",
      direction,
      token,
      amount,
      txHash,
      ip: ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress,
      source,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ EVM tx log failed:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
