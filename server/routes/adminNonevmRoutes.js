const express = require("express");
const router = express.Router();
const db = require("../db/db");

// 🔸 Set fee for a coin
router.post("/fee", async (req, res) => {
  const { coin, percent } = req.body;
  if (percent < 0 || percent > 10) return res.status(400).json({ error: "Fee must be 0-10%" });

  await db.query(
    `INSERT INTO non_evm_fees (coin, fee_percent)
     VALUES ($1, $2)
     ON CONFLICT (coin) DO UPDATE SET fee_percent = $2`,
    [coin.toUpperCase(), percent]
  );

  res.json({ success: true });
});

// 🔸 Get all coins & current fee %
router.get("/fees", async (req, res) => {
  const result = await db.query(`SELECT * FROM non_evm_fees`);
  res.json({ fees: result.rows });
});

// 🔸 Get collected fee amount per coin
router.get("/collected", async (req, res) => {
  const result = await db.query(`SELECT * FROM non_evm_collected_fees`);
  res.json({ collected: result.rows });
});

// 🔸 Withdraw collected fees (mark 0)
router.post("/withdraw", async (req, res) => {
  const { coin } = req.body;

  const { rows } = await db.query(`SELECT total_amount FROM non_evm_collected_fees WHERE coin = $1`, [coin]);
  const amount = rows[0]?.total_amount;

  if (!amount || Number(amount) === 0) {
    return res.status(400).json({ error: "Nothing to withdraw" });
  }

  // Reset after withdraw
  await db.query(`UPDATE non_evm_collected_fees SET total_amount = 0 WHERE coin = $1`, [coin]);
  res.json({ success: true, withdrawn: amount });
});

module.exports = router;
