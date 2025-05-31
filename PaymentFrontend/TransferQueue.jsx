// src/components/TransferQueue.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useBiconomyWallet } from "./hooks/useBiconomyWallet";
import moment from "moment";
import { ethers } from "ethers";
import MultiAssetWalletABI from "./ContractABI.json";
import { MULTI_ASSET_WALLET_ADDRESS } from "./constants";

const API_URL = process.env.REACT_APP_API_URL ;
export default function TransferQueue() {
  const { address, smartAccount } = useBiconomyWallet();
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTransfers = async () => {
    if (!address) return;
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/api/delayed-transfer/${address}`);
      setPendingTransfers(data);
    } catch (err) {
      console.error("❌ Failed to fetch transfers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (transfer) => {
    try {
      if (transfer.is_evm) {
        const signer = await smartAccount.getSigner();
        const contract = new ethers.Contract(
          MULTI_ASSET_WALLET_ADDRESS,
          MultiAssetWalletABI,
          signer
        );

        const tx = await contract.cancelScheduledTransfer(transfer.id);
        await tx.wait();
        alert("✅ EVM Transfer cancelled on-chain.");
      } else {
        await axios.post(`${API_URL}/api/delayed-transfer/retrieve`, {
          sender: address,
          transferId: transfer.id,
        });
        alert("✅ Non-EVM Transfer cancelled and funds returned.");
      }

      fetchTransfers(); // Refresh list
    } catch (err) {
      console.error("❌ Cancel failed:", err.message);
      alert("❌ Cancel failed.");
    }
  };

  useEffect(() => {
    fetchTransfers();
    const interval = setInterval(fetchTransfers, 30000);
    return () => clearInterval(interval);
  }, [address]);

  const formatTimeLeft = (executeAt) => {
    const now = moment();
    const exec = moment(executeAt);
    const diff = moment.duration(exec.diff(now));
    if (diff.asMilliseconds() <= 0) return "⏳ Executing...";
    return `${diff.minutes()}m ${diff.seconds()}s`;
  };

return (
  <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6 flex justify-center items-start text-white">
    <div className="w-full max-w-4xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-8 animate-fade-in">
      
      <h2 className="text-3xl font-bold mb-4 tracking-wide">⏳ Pending Transfers</h2>
      <p className="text-sm text-white/70 mb-6">
        These transfers will execute automatically after the countdown. You can cancel any before it’s finalized.
      </p>

      {loading && <p className="text-blue-300 animate-pulse">🔄 Loading pending transfers...</p>}

      {pendingTransfers.length === 0 && !loading && (
        <p className="text-white/50">🕊 No pending transfers at the moment.</p>
      )}

      {pendingTransfers.map((tx) => (
        <div
          key={tx.id}
          className="bg-white/10 border border-white/20 p-6 rounded-xl mb-4 shadow-md flex justify-between items-center"
        >
          <div>
            <p><strong className="text-green-400">To:</strong> {tx.recipient}</p>
            <p><strong className="text-blue-400">Token:</strong> {tx.token}</p>
            <p><strong className="text-yellow-300">Amount:</strong> {tx.amount}</p>
            <p><strong className="text-indigo-300">Time Left:</strong> {formatTimeLeft(tx.execute_at)}</p>
            <p><strong className="text-white/80">Type:</strong> {tx.is_evm ? "EVM" : "Non-EVM"}</p>
          </div>

          <button
            onClick={() => handleCancel(tx)}
            className="bg-gradient-to-r from-red-500 to-pink-600 px-5 py-2 rounded-lg font-semibold hover:scale-[1.02] transition-transform"
          >
            ❌ Cancel
          </button>
        </div>
      ))}
    </div>
  </div>
);

}
