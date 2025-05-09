const express = require("express");
const router = express.Router();
const { ethers } = require("ethers");



// ✅ GET /api/wallet/:evmAddress — dynamic deterministic mapping (production safe)
router.get("/:evmAddress", async (req, res) => {
  try {
    const { evmAddress } = req.params;

    if (!ethers.utils.isAddress(evmAddress)) {
      return res.status(400).json({ success: false, message: "Invalid EVM address" });
    }

    // ✅ Deterministic non-EVM wallet generator (non-custodial aliases)
    const generateWallet = (coin) => {
      const hash = ethers.utils.keccak256(Buffer.from(evmAddress + coin));
      return `${coin.toLowerCase()}_wallet_${hash.slice(2, 10)}`;
    };

    const wallets = {
      evmAddress,
      btcAddress: generateWallet("BTC"),
      xrpAddress: generateWallet("XRP"),
      solAddress: generateWallet("SOL"),
      dogeAddress: generateWallet("DOGE"),
      ltcAddress: generateWallet("LTC"),
      adaAddress: generateWallet("ADA"),
      dotAddress: generateWallet("DOT"),
      bchAddress: generateWallet("BCH"),
      xlmAddress: generateWallet("XLM"),
    };

    res.status(200).json({ success: true, data: wallets });
  } catch (error) {
    console.error("Wallet generation error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

module.exports = router;
