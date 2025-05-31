import React,{ useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL ;
export default function TxViewer() {
  const [address, setAddress] = useState("");
  const [txs, setTxs] = useState([]);

  const fetchHistory = async () => {
    const res = await axios.get(`${API_URL}/api/history/${address}`);
    setTxs(res.data);
  };
return (
  <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex justify-center items-center p-6 text-white">
    <div className="relative w-full max-w-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-8 animate-fade-in">

      {/* Glow SVG */}
      <svg className="absolute -top-8 -left-8 w-24 h-24 text-blue-500/20 animate-pulse" fill="none" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="80" fill="currentColor" />
      </svg>

      <h2 className="text-3xl font-bold text-center mb-6 tracking-wide">📜 Transaction History Viewer</h2>

      {/* Address Input */}
      <input
        type="text"
        placeholder="Enter Biconomy Wallet Address"
        value={address}
        onChange={e => setAddress(e.target.value)}
        className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all mb-4"
      />

      {/* Fetch Button */}
      <button
        onClick={fetchHistory}
        className="w-full py-3 px-6 rounded-xl font-semibold shadow-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:scale-[1.02] transition-transform"
      >
        🔍 View History
      </button>

      {/* History List */}
      <ul className="mt-8 space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {txs.map((tx) => (
          <li key={tx.tx_hash || tx.timestamp} className="bg-white/10 border border-white/20 p-4 rounded-lg text-sm shadow-sm">
            <p><strong className="text-green-400">{tx.direction.toUpperCase()}</strong> — {tx.amount} {tx.token}</p>
            <p className="text-white/70">📍 Source: {tx.source} | 🛰 IP: {tx.ip}</p>
            <p className="text-white/60">🔗 TxHash: <span className="font-mono">{tx.tx_hash?.slice(0, 10)}...</span></p>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

}
