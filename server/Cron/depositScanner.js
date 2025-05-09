// cron/depositScanner.js
const cron = require("node-cron");
const axios = require("axios");
const { fetchAllUsersFromEvents } = require("./monitorUserEvents");

const coins = ["BTC", "XRP", "SOL", "DOGE", "LTC", "ADA", "DOT", "BCH", "XLM"];
const TATUM_API_KEY = process.env.TATUM_API_KEY;

const resolveWallet = (evm, coin) => {
  const { keccak256 } = require("ethers/lib/utils");
  const hash = keccak256(Buffer.from(evm + coin));
  return `${coin.toLowerCase()}_wallet_${hash.slice(2, 10)}`;
};

const checkDeposits = async () => {
  try {
    const users = await fetchAllUsersFromEvents(); // from blockchain
    console.log(`[CRON] Scanning deposits for ${users.length} users`);

    for (let evm of users) {
      for (let coin of coins) {
        const wallet = resolveWallet(evm, coin);

        try {
          const res = await axios.get(
            `https://api.tatum.io/v3/ledger/account/${wallet}/transactions?pageSize=10`,
            {
              headers: { "x-api-key": TATUM_API_KEY },
            }
          );

          const txs = res.data || [];

          for (let tx of txs) {
            if (tx.operation === "PAYMENT" && tx.counterAccountId !== wallet) {
              // Send webhook to your backend to update balance
              await axios.post("https://your-domain.com/api/webhooks/deposit-hook", {
                address: wallet,
                amount: tx.amount,
                currency: coin,
              });

              console.log(`[✅ Deposit] ${coin} ${tx.amount} -> ${wallet}`);
            }
          }
        } catch (err) {
          console.error(`❌ Error fetching ${coin} for ${wallet}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error("[CRON] Error in checkDeposits:", err.message);
  }
};

// Run every 5 minutes
cron.schedule("*/5 * * * *", checkDeposits);

module.exports = checkDeposits;
