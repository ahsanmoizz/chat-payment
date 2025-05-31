const { ethers } = require("ethers");
const MultiAssetWalletABI = require("../../PaymentFrontend/ContractABI.json");
const { updateUserBalance } = require("../services/balanceServices");

const provider = new ethers.WebSocketProvider(process.env.WS_RPC_URL); // ✅ Use WebSocket
const contract = new ethers.Contract(process.env.WALLET_CONTRACT_ADDRESS, MultiAssetWalletABI, provider);

contract.on("Deposit", async (user, token, amount) => {
  try {
    console.log(`📥 Deposit: ${user} ${token} ${amount.toString()}`);
    await updateUserBalance(user, token, ethers.utils.formatUnits(amount, 18)); // Match decimals if needed
  } catch (err) {
    console.error("❌ Deposit sync error", err);
  }
});

contract.on("Withdrawal", async (user, token, amount) => {
  try {
    console.log(`💸 Withdrawal: ${user} ${token} ${amount.toString()}`);
    await updateUserBalance(user, token, ethers.utils.formatUnits(amount, 18)); // Store net after withdrawal
  } catch (err) {
    console.error("❌ Withdrawal sync error", err);
  }
});

contract.on("Transfer", async (from, to, token, amount) => {
  try {
    console.log(`🔁 Transfer: ${from} -> ${to} (${token}) ${amount.toString()}`);
    await updateUserBalance(from, token, null); // Optionally fetch balance again
    await updateUserBalance(to, token, null);
  } catch (err) {
    console.error("❌ Transfer sync error", err);
  }
});
