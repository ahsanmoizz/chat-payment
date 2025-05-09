const express = require("express");
const router = express.Router();
const { updateUserBalance } = require("../services/balanceServices");
const db = require("../db/db");
const crypto = require("crypto");

// 🔁 Deterministic reverse lookup
async function resolveEvmByWallet(walletAddress) {
  if (!walletAddress || typeof walletAddress !== "string") return null;

  const parts = walletAddress.split("_");
  if (parts.length < 3) return null;

  const coin = parts[0].toUpperCase();
  const hash = parts[2];

  try {
    const result = await db.query(
      `SELECT evm_address FROM user_balances
       WHERE encode(digest(evm_address || $1, 'sha256'), 'hex') LIKE $2
       LIMIT 1`,
      [coin, `%${hash}`]
    );

    return result.rows[0]?.evm_address || null;
  } catch (err) {
    console.error("❌ DB error in resolveEvmByWallet:", err.message);
    return null;
  }
}

// ✅ Webhook for incoming non-EVM deposits
router.post("/deposit-hook", async (req, res) => {
  try {
    const { address, amount, currency } = req.body;

    if (!address || !amount || !currency) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const evmAddress = await resolveEvmByWallet(address);

    if (!evmAddress) {
      console.warn("⚠️ No matching user found for wallet address:", address);
      return res.status(404).json({ error: "Unknown wallet address" });
    }

    await updateUserBalance(evmAddress, currency.toUpperCase(), amount);
    res.json({ success: true });
  } catch (err) {
    console.error("⚠️ Webhook Error:", err.message);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

module.exports = router;
