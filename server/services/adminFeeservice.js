const { ethers } = require("ethers");
require("dotenv").config();
const CONTRACT_ABI = require("../../PaymentFrontend/ContractABI.json");
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

const provider = new ethers.JsonRpcProvider(process.env.ADMIN_RPC_URL||"https://dummy-admin-rpc.yourdomain.com"); // Infura, Alchemy, etc.
const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY||"0xDUMMY_ADMIN_PRIVATE_KEY_1234567890abcdef1234567890abcdef";
const signer = new ethers.Wallet(adminPrivateKey, provider);

const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

exports.updateFee = async (req, res) => {
  try {
    const { feeType, value } = req.body;
    const type = feeType.toLowerCase(); // Normalize to lowercase

    let tx;
    switch (type) {
      case "deposit":
        tx = await contract.setDepositFee(value);
        break;
      case "withdrawal":
        tx = await contract.setWithdrawalFee(value);
        break;
      case "transaction":
        tx = await contract.setTransactionFee(value);
        break;
      case "escrow":
        tx = await contract.setEscrowServiceFee(value);
        break;
      case "multisig":
        tx = await contract.setMultisigServiceFee(value);
        break;
      default:
        return res.status(400).json({ error: "❌ Invalid fee type" });
    }

    await tx.wait();
    res.json({ success: true, txHash: tx.hash });
  } catch (err) {
    console.error("Admin fee update failed:", err);
    res.status(500).json({ error: "Failed to update fee" });
  }
};
