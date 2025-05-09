const db = require("..db/db"); // Adjust the path to your db module

module.exports = async function checkUsageLimit(req, res, next) {
  const userId = req.user?.id || req.body.userId; // support token auth or raw body

  if (!userId) return res.status(401).json({ error: "User ID missing" });

  try {
    const { rows } = await db.query(
      "SELECT current_plan FROM users WHERE id = $1",
      [userId]
    );
    const planKey = rows[0]?.current_plan || "free";

    const usageRes = await db.query(
      "SELECT tx_count FROM user_usage WHERE user_id = $1",
      [userId]
    );
    const txCount = usageRes.rows[0]?.tx_count || 0;

    const planRes = await db.query(
      "SELECT max_transactions FROM subscription_plans WHERE plan_key = $1",
      [planKey]
    );
    const maxTx = planRes.rows[0]?.max_transactions || 500;

    if (txCount >= maxTx) {
      return res.status(403).json({ error: "❌ Transaction limit reached" });
    }

    next();
  } catch (err) {
    console.error("Plan check error:", err);
    return res.status(500).json({ error: "Subscription check failed" });
  }
};
