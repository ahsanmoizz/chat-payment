// server/routes/subscriptionRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../db/db");

router.post("/confirm", async (req, res) => {
  try {
    const { userId, planKey, amount, provider , currencyUsed, country} = req.body;
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    if (!['moonpay', 'transak', 'manual'].includes(provider)) {
      return res.status(400).json({ error: "Invalid provider" });
    }
    
    // Fetch plan duration
    const planRes = await db.query("SELECT duration FROM subscription_plans WHERE plan_key = $1", [planKey]);
    if (planRes.rowCount === 0) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    const { duration } = planRes.rows[0];

    // Update user's subscription
    await db.query(
      `UPDATE users SET subscription_expiry = NOW() + $1 WHERE id = $2`,
      [duration, userId]
    );

    // Log payment
    await db.query(
      `INSERT INTO user_payments (user_id, plan_key, amount, provider, currency_used, country)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, planKey, amount, provider, currencyUsed, country]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Subscription confirmation error:", err);
    res.status(500).json({ error: "Internal error confirming subscription" });
  }
});

module.exports = router;
