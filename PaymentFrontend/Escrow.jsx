import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useBiconomyWallet } from "./hooks/useBiconomyWallet";
import ContractABI from "../abi/YourContractABI.json"; // Replace with your actual ABI file
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

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
        } catch (err) {
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
    <div className="p-8">
      <h2 className="text-2xl font-bold">Escrow Management</h2>

      <div className="mt-4">
        <input
          type="text"
          placeholder="Seller Address"
          value={seller}
          onChange={(e) => setSeller(e.target.value)}
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
          onClick={createEscrow}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Create Escrow
        </button>
      </div>

      <h3 className="text-xl font-bold mt-6">Active Escrows</h3>
      {escrows.length > 0 ? (
        <ul>
          {escrows.map((escrow) => (
            <li key={escrow.id} className="border p-4 mt-2 rounded">
              <p><strong>Buyer:</strong> {escrow.buyer}</p>
              <p><strong>Seller:</strong> {escrow.seller}</p>
              <p><strong>Amount:</strong> {escrow.amount} ETH</p>
              <p><strong>Status:</strong> {escrow.completed ? "Completed ✅" : "Pending ⏳"}</p>
              {!escrow.completed && (
                <button
                  onClick={() => completeEscrow(escrow.id)}
                  className="bg-green-500 text-white px-4 py-2 mt-2 rounded"
                >
                  Complete Escrow
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No escrows available.</p>
      )}
    </div>
  );
}
