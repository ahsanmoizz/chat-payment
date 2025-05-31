import React ,{ useState, useEffect } from "react";
import { ethers } from "ethers";
import { useBiconomyWallet } from "./hooks/useBiconomyWallet";
import ContractABI from "./ContractABI.json"; // Replace with your actual ABI file
const CONTRACT_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

export default function Escrow() {
  const { smartAccount, address } = useBiconomyWallet();
  const [seller, setSeller] = useState("");
  const [amount, setAmount] = useState("");
  const [escrows, setEscrows] = useState([]);

  useEffect(() => {
    if (smartAccount) fetchEscrows();
  }, [smartAccount]);

  const getContract = () => {
    const signer = smartAccount.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, ContractABI, signer);
  };

  const fetchEscrows = async () => {
    try {
      const contract = getContract();
      const escrowData = [];
      for (let i = 0; i < 10; i++) {
        try {
          const escrow = await contract.escrows(i);
          escrowData.push({
            id: i,
            buyer: escrow.buyer,
            seller: escrow.seller,
            token: escrow.tokenAddress,
            amount: ethers.utils.formatEther(escrow.amount),
            completed: escrow.isCompleted,
          });
        }catch (err) {
    console.error(`Error processing escrow transaction`, err);
    // Break or handle the error appropriately if this is part of a loop
    break;
}
      }
      setEscrows(escrowData);
    } catch (err) {
      console.error("Error fetching escrows:", err);
    }
  };

  const createEscrow = async () => {
    if (!smartAccount || !address) return alert("Wallet not ready.");
    try {
      const value = ethers.utils.parseEther(amount);
      const contract = getContract();
      const tx = await contract.createEscrow(
        seller,
        ethers.constants.AddressZero,
        value,
        0,
        false,
        { value }
      );
      await tx.wait();
      fetchEscrows();
      alert("Escrow Created!");
    } catch (err) {
      console.error(err);
      alert("Failed to create escrow");
    }
  };

  const completeEscrow = async (id) => {
    try {
      const contract = getContract();
      const tx = await contract.completeEscrow(id);
      await tx.wait();
      fetchEscrows();
      alert("Escrow Completed!");
    } catch (err) {
      console.error(err);
      alert("Failed to complete escrow");
    }
  };
return (
  <div className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] p-8 text-white flex justify-center items-start">
    <div className="w-full max-w-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-8 animate-fade-in">
      
      <h2 className="text-3xl font-bold tracking-wide text-center mb-6">🛡️ Escrow Management</h2>

      {/* Create Escrow */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Seller Address"
          value={seller}
          onChange={(e) => setSeller(e.target.value)}
          className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <input
          type="number"
          placeholder="Amount (ETH)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <button
          onClick={createEscrow}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 rounded-xl font-semibold shadow-lg hover:scale-[1.02] transition-transform"
        >
          Create Escrow
        </button>
      </div>

      {/* Escrow List */}
      <h3 className="text-2xl font-semibold mt-8 mb-4">📄 Active Escrows</h3>

      {escrows.length > 0 ? (
        <ul className="space-y-4">
          {escrows.map((escrow) => (
            <li key={escrow.id} className="bg-white/10 border border-white/20 p-6 rounded-xl shadow-md">
              <p><strong className="text-pink-300">Buyer:</strong> {escrow.buyer}</p>
              <p><strong className="text-green-300">Seller:</strong> {escrow.seller}</p>
              <p><strong className="text-yellow-300">Amount:</strong> {escrow.amount} ETH</p>
              <p><strong className="text-white/80">Status:</strong> {escrow.completed ? "✅ Completed" : "⏳ Pending"}</p>

              {!escrow.completed && (
                <button
                  onClick={() => completeEscrow(escrow.id)}
                  className="mt-4 bg-gradient-to-r from-green-400 to-teal-500 px-6 py-2 rounded-lg font-semibold hover:scale-[1.02] transition-transform"
                >
                  ✅ Complete Escrow
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-white/60 mt-4">🚫 No escrows available.</p>
      )}
    </div>
  </div>
);

}
