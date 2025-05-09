const { deductUserBalance, updateUserBalance } = require("./balanceService");
const recordTransaction = require("../utils/recordTransaction");

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
    source: "internal-delayed"
  });
}

module.exports = sendNonEvmToken;
