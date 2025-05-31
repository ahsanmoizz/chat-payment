// /api/deposit-hook.js
const express = require("express");
const router = express.Router();

// Tatum will send POST requests here
router.post("/", (req, res) => {
  const body = req.body;
  console.log("🔔 Webhook received from Tatum:", body);

  // You can add custom logic here:
  // - Save to DB
  // - Trigger notification
  // - Validate incoming tx

  res.status(200).json({ success: true });
});

module.exports = router;
