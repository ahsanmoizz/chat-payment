const express = require("express");
const router = express.Router();
const db = require("../db/db");

// 🔹 Get all subscription plans
router.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM subscription_plans");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching plans:", err);
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});

// 🔹 Create or upsert a plan (used if adding from admin)
router.post("/", async (req, res) => {
  const { plan_key, name, max_transactions, max_messages, price_usd, duration} = req.body;

  try {
    await db.query(`
      INSERT INTO subscription_plans (plan_key, name, max_transactions, max_messages, price_usd, duration)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (plan_key)
      DO UPDATE SET
        name = $2,
        max_transactions = $3,
        max_messages = $4,
        price_usd = $5,
        duration = $6
    `, [plan_key, name, max_transactions, max_messages, price_usd, duration]);

    res.json({ success: true });
  } catch (err) {
    console.error("Error creating/updating plan:", err);
    res.status(500).json({ error: "Failed to create or update plan" });
  }
});

// ✅ 🔹 PUT: Update an existing plan by key (used in AdminSubscriptionPlans.jsx)
router.put("/:planKey", async (req, res) => {
  const { planKey } = req.params;
  const { name, max_transactions, max_messages, price_usd, duration, features,country_prices } = req.body;
  if (country_prices && typeof country_prices !== "object") {
    return res.status(400).json({ error: "Invalid country price format" });
  }
  
  try{await db.query(
    `UPDATE subscription_plans
     SET name = $1, max_transactions = $2, max_messages = $3,
         price_usd = $4, duration = $5, country_prices = $6, features = $7
     WHERE plan_key = $8`,
    [name, max_transactions, max_messages, price_usd, duration, country_prices, features, planKey]
  );
  
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating plan:", err);
    res.status(500).json({ error: "Failed to update plan" });
  }
});

module.exports = router;
