const db = require("../db/db");
const recordTransaction = require("../utils/recordTransaction");

// ✅ Add or update a user's balance (overwrite mode)
async function updateUserBalance(evmAddress, coin, amount) {
  await db.query(
    "INSERT INTO user_balances (evm_address, coin, amount) VALUES ($1, $2, $3) ON CONFLICT (evm_address, coin) DO UPDATE SET amount = $3",
    [evmAddress, coin, amount]
  );
}

// ✅ Get all balances for a user
async function getUserBalances(evmAddress) {
  const result = await db.query(
    "SELECT coin, amount FROM user_balances WHERE evm_address = $1",
    [evmAddress]
  );
  const balances = {};
  for (const row of result.rows) {
    balances[row.coin] = row.amount;
  }
  return balances;
}

// ✅ Check if user has enough balance
async function checkUserBalance(evmAddress, coin, requestedAmount) {
  const result = await db.query(
    "SELECT amount FROM user_balances WHERE evm_address = $1 AND coin = $2",
    [evmAddress, coin]
  );
  const available = parseFloat(result.rows[0]?.amount || "0");
  return available >= parseFloat(requestedAmount);
}

// ✅ Deduct balance
async function deductUserBalance(evmAddress, coin, amount) {
  await db.query(
    `UPDATE user_balances
     SET amount = (amount::numeric - $3::numeric)
     WHERE evm_address = $1 AND coin = $2`,
    [evmAddress, coin, amount]
  );
}

// ✅ Send token from one user to another
async function sendToken(req, res) {
  try {
    const { evmAddress, recipient, coin, amount, userId } = req.body;

    await db.query(
      `UPDATE user_balances
       SET amount = (amount::numeric - $1::numeric)
       WHERE evm_address = $2 AND coin = $3`,
      [amount, evmAddress, coin]
    );

    await db.query(
      `INSERT INTO user_balances (evm_address, coin, amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (evm_address, coin)
       DO UPDATE SET amount = user_balances.amount::numeric + $3::numeric`,
      [recipient, coin, amount]
    );

    await db.query(
      `UPDATE user_usage SET tx_count = tx_count + 1 WHERE user_id = $1`,
      [userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Send token failed:", err.message);
    res.status(500).json({ error: err.message });
  }
}

// ✅ Send non-EVM token
async function sendNonEvmToken({ sender, recipient, coin, amount, ip }) {
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
    source: "internal"
  });
}

// ✅ Lock balance (for delayed transfer)
async function lockUserBalance(evmAddress, coin, amount) {
  await db.query(
    `UPDATE user_balances
     SET amount = (amount::numeric - $3::numeric),
         locked = COALESCE(locked, 0) + $3::numeric
     WHERE evm_address = $1 AND coin = $2`,
    [evmAddress, coin, amount]
  );
}

// ✅ Release locked balance
async function releaseLockedBalance(evmAddress, coin, amount) {
  await db.query(
    `UPDATE user_balances
     SET amount = amount::numeric + $3::numeric,
         locked = locked::numeric - $3::numeric
     WHERE evm_address = $1 AND coin = $2`,
    [evmAddress, coin, amount]
  );
}

// ✅ Finalize locked transfer
async function finalizeLockedTransfer(sender, recipient, coin, amount) {
  await db.query("BEGIN");

  try {
    await db.query(
      `UPDATE user_balances
       SET locked = locked::numeric - $3::numeric
       WHERE evm_address = $1 AND coin = $2`,
      [sender, coin, amount]
    );

    await db.query(
      `INSERT INTO user_balances (evm_address, coin, amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (evm_address, coin)
       DO UPDATE SET amount = user_balances.amount::numeric + $3::numeric`,
      [recipient, coin, amount]
    );

    await db.query("COMMIT");
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  }
}

module.exports = {
  updateUserBalance,
  getUserBalances,
  checkUserBalance,
  deductUserBalance,
  sendNonEvmToken,
  sendToken,
  lockUserBalance,
  releaseLockedBalance,
  finalizeLockedTransfer
};
