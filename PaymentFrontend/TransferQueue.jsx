// src/components/TransferQueue.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { useBiconomyWallet } from "../hooks/useBiconomyWallet";
import moment from "moment";
import { ethers } from "ethers";
import MultiAssetWalletABI from "./ContractABI.json";
import { MULTI_ASSET_WALLET_ADDRESS } from "./constants";

export default function TransferQueue() {
  const { address, smartAccount } = useBiconomyWallet();
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTransfers = async () => {
    if (!address) return;
    try {
      setLoading(true);
      const { data } = await axios.get(`https://dummy-api.yourdomain.com/api/delayed-transfer/${address}`);
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
        await axios.post("https://dummyapi.yourdomain.com/api/delayed-transfer/retrieve", {
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
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4">🕒 Pending Transfers</h2>
      <p className="text-sm text-gray-600 mb-4">
        These transfers will be executed automatically after the selected time. You may cancel them before execution.
      </p>

      {loading && <p className="text-blue-500">Loading...</p>}
      {pendingTransfers.length === 0 && !loading && (
        <p className="text-gray-500">No pending transfers.</p>
      )}

      {pendingTransfers.map((tx) => (
        <div
          key={tx.id}
          className="border p-4 mb-4 rounded shadow bg-white flex justify-between items-center"
        >
          <div>
            <p><strong>To:</strong> {tx.recipient}</p>
            <p><strong>Token:</strong> {tx.token}</p>
            <p><strong>Amount:</strong> {tx.amount}</p>
            <p><strong>Time left:</strong> {formatTimeLeft(tx.execute_at)}</p>
            <p><strong>Type:</strong> {tx.is_evm ? "EVM" : "Non-EVM"}</p>
          </div>

          <button
            onClick={() => handleCancel(tx)}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Cancel
          </button>
        </div>
      ))}
    </div>
  );
}
