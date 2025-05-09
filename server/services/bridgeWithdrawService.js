const { checkUserBalance, deductUserBalance, updateUserBalance } = require("./balanceService");
const axios = require("axios");
const db = require("../db/db");
const recordTransaction = require("../utils/recordTransaction");

// Helper: Get fee %
const getNonEvmFee = async (coin, type = "bridge_fee") => {
  const result = await db.query(`SELECT ${type} FROM non_evm_fees WHERE coin = $1`, [coin]);
  return result.rows[0]?.[type] || 0; // Default 0% if not set
};

// Helper: Log fee to collected_fees
const logCollectedFee = async (coin, feeAmount) => {
  await db.query(
    `INSERT INTO non_evm_collected_fees (coin, total_amount)
     VALUES ($1, $2)
     ON CONFLICT (coin)
     DO UPDATE SET total_amount = non_evm_collected_fees.total_amount + $2`,
    [coin, feeAmount]
  );
};

exports.handleBridgeWithdraw = async (req, res) => {
  try {
    const { evmAddress, nonEvmCoin, destinationAddress, amount } = req.body;
    const parsedAmount = Number(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const hasEnough = await checkUserBalance(evmAddress, nonEvmCoin, parsedAmount);
    if (!hasEnough) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Calculate Fee
    const feePercent = await getNonEvmFee(nonEvmCoin);
    const feeAmount = (parsedAmount * feePercent) / 100;
    const finalAmount = parsedAmount - feeAmount;

    // Deduct full amount from user
    await deductUserBalance(evmAddress, nonEvmCoin, parsedAmount);

    // Prepare bridge request
    const response = await axios.post("https://li.quest/v1/bridge", {
      fromChain: "ethereum",
      fromToken: nonEvmCoin,
      fromAddress: evmAddress,
      toAddress: destinationAddress,
      amount: finalAmount,
    });

    // Rollback on failure
    if (!response.data?.txHash) {
      await updateUserBalance(evmAddress, nonEvmCoin, parsedAmount);
      return res.status(500).json({ error: "Bridge failed, funds returned." });
    }

    // ✅ Log collected fee (only after success)
    await logCollectedFee(nonEvmCoin, feeAmount);

    // ✅ Log bridge withdrawal
    await db.query(
      `INSERT INTO withdrawals (evm_address, coin, amount, destination)
       VALUES ($1, $2, $3, $4)`,
      [evmAddress, nonEvmCoin, finalAmount, destinationAddress]
    );

    // ✅ Record transaction
    await recordTransaction({
      userAddress: evmAddress,
      type: nonEvmCoin,
      direction: "withdraw",
      token: nonEvmCoin,
      amount: parsedAmount,
      txHash: response.data.txHash || null,
      ip: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
      source: "bridge",
    });

    res.json({ success: true, tx: response.data });
  } catch (err) {
    console.error("Bridge withdraw error:", err.message);
    res.status(500).json({ error: "Withdrawal failed" });
  }
};
