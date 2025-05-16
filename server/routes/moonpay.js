const express = require("express");
const router = express.Router();
const { ethers } = require("ethers");
const { updateUserBalance } = require("../services/balanceServices");
const recordTransaction = require("../utils/recordTransaction");
const MultiAssetWalletABI = require("../../PaymentFrontend/ContractABI.json");

// Setup provider and wallet
const provider = new ethers.JsonRpcProvider(process.env.INFURA_RPC_URL||"https://dummy-infura.io/v3/YOUR_INFURA_PROJECT_ID");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider||"0xDUMMY_PRIVATE_KEY_1234567890abcdef1234567890abcdef12345678");
const contract = new ethers.Contract(
  process.env.MULTI_ASSET_WALLET_ADDRESS|| "0xDUMMY_CONTRACT_ADDRESS_1234567890abcdef1234567890abcdef",
  MultiAssetWalletABI,
  wallet
);

function isValidAddress(address) {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

router.post("/moonpay", async (req, res) => {
  if (req.headers["x-webhook-secret"] !== process.env.MOONPAY_WEBHOOK_SECRET) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { walletAddress, cryptoAmount, txHash } = req.body;
    const userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    if (!walletAddress || !isValidAddress(walletAddress)) {
      return res.status(400).json({ error: "Invalid wallet address" });
    }

    if (!cryptoAmount || isNaN(cryptoAmount) || parseFloat(cryptoAmount) <= 0) {
      return res.status(400).json({ error: "Invalid crypto amount" });
    }

    const tx = await contract.depositETH({
      value: ethers.parseEther(cryptoAmount.toString()),
      gasLimit: 100000
    });

    await tx.wait();

    await updateUserBalance(walletAddress, "ETH", cryptoAmount);

    await recordTransaction({
      userAddress: walletAddress,
      type: "ETH",
      direction: "deposit",
      token: "ETH",
      amount: cryptoAmount,
      txHash,
      ip: userIP,
      source: "moonpay"
    });

    console.log("✅ ETH deposited via MoonPay for", walletAddress);
    return res.status(200).end();
  } catch (err) {
    console.error("❌ MoonPay Webhook Failed:", err.message);
    return res.status(500).json({ error: "Webhook failed" });
  }
});

module.exports = router;
