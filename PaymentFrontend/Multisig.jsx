import React ,{ useState, useEffect } from "react";
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
  <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-8 text-white flex justify-center items-start">
    <div className="w-full max-w-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-8 animate-fade-in">
      
      <h2 className="text-3xl font-bold text-center mb-6 tracking-wide">🧾 Multi-Signature Transactions</h2>

      {/* Create Multisig Tx Form */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Recipient Address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        />
        <input
          type="number"
          placeholder="Amount (ETH)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        />
        <button
          onClick={createTransaction}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 rounded-xl font-semibold shadow-lg hover:scale-[1.02] transition-transform"
        >
          Create Transaction
        </button>
      </div>

      {/* Transaction List */}
      <h3 className="text-2xl font-semibold mb-4 mt-6">🕒 Pending Transactions</h3>

      {txs.length > 0 ? (
        <ul className="space-y-4">
          {txs.map((tx) => (
            <li key={tx.id} className="bg-white/10 border border-white/20 p-6 rounded-xl shadow-md">
              <p><strong className="text-blue-400">Initiator:</strong> {tx.initiator}</p>
              <p><strong className="text-green-400">Recipient:</strong> {tx.recipient}</p>
              <p><strong className="text-yellow-300">Amount:</strong> {tx.amount} ETH</p>
              <p><strong className="text-white/80">Approvals:</strong> {tx.approvals}/2</p>
              <p><strong className="text-white/70">Status:</strong> {tx.executed ? "✅ Executed" : "⏳ Pending"}</p>

              {!tx.executed && (
                <button
                  onClick={() => approveTransaction(tx.id)}
                  className="mt-4 bg-gradient-to-r from-green-400 to-teal-500 px-6 py-2 rounded-lg font-semibold hover:scale-[1.02] transition-transform"
                >
                  ✅ Approve Transaction
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-white/60 mt-4">🚫 No transactions available.</p>
      )}
    </div>
  </div>
);

}
