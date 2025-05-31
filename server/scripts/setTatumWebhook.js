const axios = require("axios");
const { ethers } = require("ethers"); 
const { getSetting } = require("../utils/appSettings");
async function registerAllHooks() {
const TATUM_API_KEY = await getSetting("TATUM_API_KEY");
const TATUM_WEBHOOK_URL = await getSetting("TATUM_WEBHOOK_BASE_URL");
const SUPPORTED_CHAINS = ["BTC", "XRP", "LTC", "DOGE", "SOL"];
 const API_URL = process.env.REACT_APP_API_URL ;
const BASE_URL = `${API_URL}/api/deposit-hook`;

const evmAddress = await getSetting("REACT_APP_ADMIN_WALLET");
const generateWallet = (coin) => {
  const hash = ethers.utils.keccak256(Buffer.from(evmAddress + coin));
  return `${coin.toLowerCase()}_wallet_${hash.slice(2, 10)}`;
};


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
