const axios = require("axios");

const TATUM_API_KEY = process.env.TATUM_API_KEY;
const TATUM_WEBHOOK_URL = "https://api.tatum.io/v3/subscription";

const SUPPORTED_CHAINS = ["BTC", "XRP", "LTC", "DOGE", "SOL"];
const BASE_URL = "https://your-server.com/api/deposit-hook";

const evmAddress = "0x123abc..."; // Replace dynamically
const generateWallet = (coin) => {
  const hash = ethers.utils.keccak256(Buffer.from(evmAddress + coin));
  return `${coin.toLowerCase()}_wallet_${hash.slice(2, 10)}`;
};

async function registerAllHooks() {
  for (const chain of SUPPORTED_CHAINS) {
    const address = generateWallet(chain);
    try {
      const res = await axios.post(
        TATUM_WEBHOOK_URL,
        {
          type: "ADDRESS_TRANSACTION",
          attr: {
            chain,
            address,
          },
          url: BASE_URL,
        },
        {
          headers: {
            "x-api-key": TATUM_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`✅ Hook registered for ${chain}: ${res.data.id}`);
    } catch (err) {
      console.error(`❌ Failed to register hook for ${chain}:`, err.response?.data || err.message);
    }
  }
}

registerAllHooks();
