import { useState } from "react";
import axios from "axios";

export default function TxViewer() {
  const [address, setAddress] = useState("");
  const [txs, setTxs] = useState([]);

  const fetchHistory = async () => {
    const res = await axios.get(`https://dummyapi.yourdomain.com/api/history/${dummyAddress}`);
    setTxs(res.data);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Transaction History Viewer</h2>
      <input
        type="text"
        placeholder="Enter Biconomy Address"
        value={address}
        onChange={e => setAddress(e.target.value)}
        className="border p-2 rounded w-full"
      />
      <button
        onClick={fetchHistory}
        className="bg-blue-600 text-white mt-3 px-4 py-2 rounded"
      >
        View History
      </button>

      <ul className="mt-6">
  {txs.map((tx) => (
    <li key={tx.tx_hash || tx.timestamp} className="border-b p-2 text-sm">
      <strong>{tx.direction.toUpperCase()}</strong> — {tx.amount} {tx.token}
      <br />
      Source: {tx.source} | IP: {tx.ip}
      <br />
      TxHash: {tx.tx_hash?.slice(0, 10)}...
    </li>
  ))}
</ul>

    </div>
  );
}
