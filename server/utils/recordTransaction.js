const db = require("../db");

async function recordTransaction({
  userAddress, type, direction, token, amount, txHash, status = "confirmed", ip, source = "internal"
}) 
 {
  await db.query(
    `INSERT INTO user_transactions 
     (user_address, type, direction, token, amount, tx_hash, status, ip, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [userAddress, type, direction, token, amount, txHash, status, ip, source]
  );
}

module.exports = recordTransaction;
