import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useBiconomyWallet } from "./hooks/useBiconomyWallet";
import ContractABI from "./ContractABI.json"; // Update with correct path
const CONTRACT_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";;

export default function MultiSig() {
  const { smartAccount} = useBiconomyWallet();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [txs, setTxs] = useState([]);

  useEffect(() => {
    if (smartAccount) fetchTransactions();
  }, [smartAccount]);

  const getContract = () => {
    const signer = smartAccount.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, ContractABI, signer);
  };

  const fetchTransactions = async () => {
    try {
      const contract = getContract();
      const txData = [];
      for (let i = 0; i < 10; i++) {
        try {
          const tx = await contract.multisigTxs(i);
          txData.push({
            id: i,
            initiator: tx.initiator,
            recipient: tx.recipient,
            amount: ethers.utils.formatEther(tx.amount),
            approvals: tx.approvals.toNumber(),
            executed: tx.executed,
          });
        }catch (err) {
    console.error(`Error fetching multisig transaction at index ${i}:`, err);
    // Break or handle the error appropriately if this is part of a loop
    break;
}
      }
      setTxs(txData);
    } catch (err) {
      console.error("Failed to fetch multisig txs:", err);
    }
  };

  const createTransaction = async () => {
    if (!smartAccount) return alert("Wallet not ready.");
    try {
      const contract = getContract();
      const value = ethers.utils.parseEther(amount);
      const tx = await contract.createMultiSigTransaction(
        recipient,
        ethers.constants.AddressZero,
        value,
        0,
        false,
        { value }
      );
      await tx.wait();
      fetchTransactions();
      alert("Transaction Created!");
    } catch (err) {
      console.error(err);
      alert("Failed to create transaction");
    }
  };

  const approveTransaction = async (id) => {
    try {
      const contract = getContract();
      const tx = await contract.approveMultiSigTransaction(id);
      await tx.wait();
      fetchTransactions();
      alert("Transaction Approved!");
    } catch (err) {
      console.error(err);
      alert("Approval failed");
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold">Multi-Signature Transactions</h2>

      <div className="mt-4">
        <input
          type="text"
          placeholder="Recipient Address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="border p-2 mr-2 rounded"
        />
        <input
          type="number"
          placeholder="Amount (ETH)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="border p-2 mr-2 rounded"
        />
        <button
          onClick={createTransaction}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Create Transaction
        </button>
      </div>

      <h3 className="text-xl font-bold mt-6">Pending Transactions</h3>
      {txs.length > 0 ? (
        <ul>
          {txs.map((tx) => (
            <li key={tx.id} className="border p-4 mt-2 rounded">
              <p><strong>Initiator:</strong> {tx.initiator}</p>
              <p><strong>Recipient:</strong> {tx.recipient}</p>
              <p><strong>Amount:</strong> {tx.amount} ETH</p>
              <p><strong>Approvals:</strong> {tx.approvals}/2</p>
              <p><strong>Status:</strong> {tx.executed ? "Executed ✅" : "Pending ⏳"}</p>
              {!tx.executed && (
                <button
                  onClick={() => approveTransaction(tx.id)}
                  className="bg-green-500 text-white px-4 py-2 mt-2 rounded"
                >
                  Approve Transaction
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No transactions available.</p>
      )}
    </div>
  );
}
