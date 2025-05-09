const express = require("express");
const router = express.Router();
const {
  updateUserBalance,
  getUserBalances,
  sendToken,
} = require("../services/balanceService");

const checkUsageLimit = require("../middleware/planLimitGuard");

// POST /api/balances/update
router.post("/update", async (req, res) => {
  try {
    const { evmAddress, coin, amount } = req.body;
    await updateUserBalance(evmAddress, coin, amount);
    res.json({ success: true });
  } catch (err) {
    console.error("Update balance failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/balances/:evmAddress
router.get("/:evmAddress", async (req, res) => {
  try {
    const balances = await getUserBalances(req.params.evmAddress);
    res.json({ success: true, balances });
  } catch (err) {
    console.error("Fetch balance failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST /api/balances/send — usage counted internally
router.post("/send", checkUsageLimit, sendToken); // 👈 this is now safe

module.exports = router;
