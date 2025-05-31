const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const db = require("../db/db");
const { recordTransaction } = require("../utils/recordTransaction");
const { getSetting } = require("../utils/appSettings");
router.post("/coinbase", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["x-cc-webhook-signature"];
  const secret = await getSetting("COINBASE_WEBHOOK_SECRET");

  const computedSig = crypto
    .createHmac("sha256", secret)
    .update(req.body)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(computedSig))) {
    console.warn("❌ Invalid Coinbase signature");
    return res.status(401).send("Invalid signature");
  }

  const payload = JSON.parse(req.body);
  const event = payload.event;

  if (event.type !== "charge:confirmed") {
    return res.status(200).send("Ignored (not confirmed)");
  }

  try {
    const charge = event.data;
    const fiatAmount = parseFloat(charge.pricing.local.amount);
    const walletAddress = charge.metadata.customer_wallet || charge.metadata.evm_address;
    const cryptoCurrency = charge.payments?.[0]?.network || "crypto";

    // Lookup plan
    const planRes = await db.query(
      `SELECT plan_key, duration FROM subscription_plans WHERE price_usd = $1 LIMIT 1`,
      [Math.round(fiatAmount)]
    );
    if (!planRes.rows.length) return res.status(400).json({ error: "No matching plan" });

    const { plan_key, duration } = planRes.rows[0];

    // Lookup user
    const userRes = await db.query(`SELECT id FROM users WHERE evm_address = $1`, [walletAddress]);
    if (!userRes.rows.length) return res.status(404).json({ error: "User not found" });

    const userId = userRes.rows[0].id;

    // Update subscription
    await db.query(
      `UPDATE users
       SET current_plan = $1, subscription_expiry = NOW() + INTERVAL '${duration} days'
       WHERE id = $2`,
      [plan_key, userId]
    );

    // Record transaction
    await db.query(
      `INSERT INTO user_transactions (user_address, type, direction, token, amount, tx_hash, source, ip)
       VALUES ($1, 'subscription', 'deposit', $2, $3, $4, 'coinbase', $5)`,
      [walletAddress, cryptoCurrency, fiatAmount, null, req.ip]
    );

    await recordTransaction({
      userAddress: walletAddress,
      type: "crypto",
      direction: "deposit",
      token: cryptoCurrency,
      amount: fiatAmount,
      txHash: null,
      ip: req.ip,
      source: "coinbase"
    });

    console.log("✅ Coinbase subscription assigned to:", userId);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("❌ Coinbase webhook error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
