const express = require("express");
const router = express.Router();
const db = require("../db/db");
const { recordTransaction } = require("../utils/recordTransaction");
const { getSetting } = require("../utils/appSettings");
router.post("/onmeta", async (req, res) => {
  const secret = await getSetting("ONMETA_WEBHOOK_SECRET");
if (req.headers["x-webhook-secret"] !== secret) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { walletAddress, fiatAmount, cryptoAmount, cryptoCurrency, status } = req.body;

    if (status !== "COMPLETED") return res.status(200).send("Ignored");

    // Match plan by fiat amount
    const planRes = await db.query(
      `SELECT plan_key, duration FROM subscription_plans WHERE price_usd = $1 LIMIT 1`,
      [parseFloat(fiatAmount)]
    );
    if (!planRes.rows.length) return res.status(400).json({ error: "No matching plan" });

    const { plan_key, duration } = planRes.rows[0];

    // Lookup user
    const userRes = await db.query(
      `SELECT id FROM users WHERE evm_address = $1`,
      [walletAddress]
    );
    if (!userRes.rows.length) return res.status(404).json({ error: "User not found" });

    const userId = userRes.rows[0].id;

    // Update plan and expiry
    await db.query(
      `UPDATE users
       SET current_plan = $1, subscription_expiry = NOW() + INTERVAL '${duration} days'
       WHERE id = $2`,
      [plan_key, userId]
    );

    // Record transaction
    await db.query(
      `INSERT INTO user_transactions (user_address, type, direction, token, amount, tx_hash, source, ip)
       VALUES ($1, 'subscription', 'deposit', $2, $3, $4, 'onmeta', $5)`,
      [walletAddress, cryptoCurrency || "USDT", fiatAmount, null, req.ip]
    );
   await recordTransaction({
  userAddress: walletAddress,
  type: "ETH",
  direction: "deposit",
  token: cryptoCurrency || "ETH",
  amount: cryptoAmount,
  txHash: null,
  ip: req.ip,
  source: "onmeta"
});

    console.log("✅ Onmeta subscription assigned to:", userId);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("❌ Onmeta webhook error:", err.message);
    return res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
