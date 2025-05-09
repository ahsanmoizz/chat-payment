// services/nonEvmTransfer.js
const db = require("../db/db");
const recordTransaction = require("../utils/recordTransaction");
const { updateUserBalance, deductUserBalance } = require("../services/balanceServices");

/**
 * ✅ Immediate Non-EVM Transfer
 */
async function sendNonEvmToken({ sender, recipient, coin, amount, ip = null }) {
  await deductUserBalance(sender, coin, amount);
  await updateUserBalance(recipient, coin, amount);

  await recordTransaction({
    userAddress: sender,
    type: coin,
    direction: "transfer",
    token: coin,
    amount,
    txHash: null,
    ip,
    source: "internal",
  });
}

/**
 * 🕒 Schedule Non-EVM Transfer
 */
async function scheduleNonEvmTransfer({ sender, recipient, coin, amount, delayMinutes }) {
  const delayInMs = delayMinutes * 60 * 1000;
  const scheduledAt = new Date(Date.now() + delayInMs);

  // ✅ Balance check
  const result = await db.query(
    "SELECT amount FROM user_balances WHERE evm_address = $1 AND coin = $2",
    [sender, coin]
  );
  const balance = parseFloat(result.rows[0]?.amount || "0");
  if (balance < parseFloat(amount)) {
    throw new Error("Insufficient balance for delayed transfer.");
  }

  // ✅ Lock sender funds
  await deductUserBalance(sender, coin, amount);

  // ✅ Save scheduled transfer
  await db.query(
    `INSERT INTO delayed_transfers (sender, recipient, token, amount, is_evm, scheduled_at, status)
     VALUES ($1, $2, $3, $4, false, $5, 'scheduled')`,
    [sender, recipient, coin, amount, scheduledAt]
  );
}

module.exports = {
  sendNonEvmToken,
  scheduleNonEvmTransfer,
};
