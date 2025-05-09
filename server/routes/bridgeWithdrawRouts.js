const express = require("express");
const router = express.Router();
const { handleBridgeWithdraw } = require("../services/bridgeWithdrawService");
const checkUsageLimit = require("../middleware/planLimitGuard");
router.post("/bridge-withdraw", checkUsageLimit, handleBridgeWithdraw);
const { getUserBalances } = require("../services/balanceServices");

// ✅ New GET /api/balances/:evmAddress
router.get("/balances/:evmAddress", async (req, res) => {
  try {
    const balances = await getUserBalances(req.params.evmAddress);
    res.json({ balances });
  } catch (err) {
    console.error("Fetch balances error:", err.message);
    res.status(500).json({ error: "Unable to fetch balances" });
  }
});

module.exports = router;
