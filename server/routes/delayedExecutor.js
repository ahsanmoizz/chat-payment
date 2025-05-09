// delayedExecutor.js
require("dotenv").config();
const db = require("../db/db");
const { ethers } = require("ethers");
const MultiAssetWalletABI = require("../abis/MultiAssetWallet.json");
const { sendNonEvmToken } = require("../services/nonEvmTransfer");
const recordTransaction = require("../utils/recordTransaction");

const provider = new ethers.JsonRpcProvider(process.env.INFURA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(
  process.env.MULTI_ASSET_WALLET_ADDRESS,
  MultiAssetWalletABI,
  wallet
);

// Main Job
async function processDelayedTransfers() {
  try {
    const now = new Date();
    const { rows: readyTransfers } = await db.query(
      `SELECT * FROM user_delayed_transfers
       WHERE execute_at <= $1 AND status = 'pending'`,
      [now]
    );

    for (const transfer of readyTransfers) {
      const { id, sender, recipient, token, amount, is_evm } = transfer;

      try {
        if (is_evm) {
          console.log(`🔁 Executing EVM scheduled transfer ID ${id}`);

          const tx = await contract.executeScheduledTransfer(id);
          await tx.wait();

          console.log(`✅ EVM Transfer ID ${id} executed on-chain`);

          await recordTransaction({
            userAddress: sender,
            type: "EVM",
            direction: "transfer",
            token,
            amount,
            txHash: tx.hash,
            ip: null,
            source: "delayed-executor"
          });

        } else {
          console.log(`🔁 Executing Non-EVM scheduled transfer ID ${id}`);
          
          await sendNonEvmToken({ sender, recipient, coin: token, amount, ip: null });

          await recordTransaction({
            userAddress: sender,
            type: token,
            direction: "transfer",
            token,
            amount,
            txHash: null,
            ip: null,
            source: "delayed-executor"
          });
        }

        await db.query(
          `UPDATE user_delayed_transfers SET status = 'executed' WHERE id = $1`,
          [id]
        );

      } catch (err) {
        console.error(`❌ Failed to process transfer ID ${id}:`, err.message);
      }
    }
  } catch (err) {
    console.error("❌ Delayed transfer job error:", err.message);
  }
}

// Run every 30 sec
setInterval(processDelayedTransfers, 30 * 1000);
console.log("⏳ Delayed transfer executor started.");
