const db = require("../db/db");

module.exports = async function checkSubscription(req, res, next) {
  const userId = req.user.id;

  try {
    const { rows } = await db.query(
      "SELECT subscription_expiry FROM users WHERE id = $1",
      [userId]
    );

    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });

    const now = new Date();
    const expiry = new Date(user.subscription_expiry);

    if (now > expiry) {
      return res.status(403).json({ error: "❌ Subscription expired. Please upgrade to continue." });
    }

    next();
  } catch (err) {
    console.error("Subscription check failed:", err);
    return res.status(500).json({ error: "Subscription check failed" });
  }
};
