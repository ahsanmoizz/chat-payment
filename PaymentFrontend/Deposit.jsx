import React ,{ useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import QrScanner from 'react-qr-scanner';

import { ethers } from "ethers";
import { useBiconomyWallet } from "./hooks/useBiconomyWallet";
import ContractABI from "./ContractABI.json";
import axios from "axios";

const CONTRACT_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

const API_URL = process.env.REACT_APP_API_URL ;
export default function Receive() {
  const { smartAccount, address } = useBiconomyWallet();
  const [scanning, setScanning] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [username, setUsername] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const navigate = useNavigate();

  const validUsername = username && username !== "Not set";
let qrData = "";

if (validUsername) {
  qrData = `app://pay?user=${username}&amt=0&token=ETH`;
} else if (accountNumber) {
  qrData = `app://pay?acct=${accountNumber}&amt=0&token=ETH`;
}

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!smartAccount || !address) return;

      const signer = await smartAccount.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ContractABI, signer);

      try {
        const name = await contract.getUsername(address);
        setUsername(name);

        const user = await contract.getAccountDetails(address);
        setAccountNumber(user.accountNumber);
      } catch (err) {
        console.warn("Failed to fetch user info:", err);
      }
    };

    fetchUserInfo();
  }, [smartAccount, address]);

  const getContract = async () => {
    const signer = await smartAccount.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, ContractABI, signer);
  };

  const handleScan = (data) => {
    if (data) {
      try {
        const url = new URL(data);
        if (url.protocol === "app:" && url.hostname === "pay") {
          const acct = url.searchParams.get("acct");
          const user = url.searchParams.get("user");
          const amt = url.searchParams.get("amt");
          const token = url.searchParams.get("token");

          if (acct || user) {
            const recipient = user ? `user=${user}` : `acct=${acct}`;
            navigate(`/Send?${recipient}&amt=${amt}&token=${token}`);
          }
        }
      } catch (e) {
        alert("❌ Invalid QR Code scanned");
        console.warn("Invalid QR scanned", e);
      }
    }
  };

  const handleError = (err) => {
    console.error("QR Scan Error:", err);
  };

  const handleDeposit = async () => {
    if (!smartAccount) return alert("Wallet not ready.");

    if (!depositAmount || isNaN(depositAmount) || Number(depositAmount) <= 0) {
      return alert("Please enter a valid ETH amount");
    }

    try {
      const contract = await getContract();
      const tx = await contract.depositETH({
        value: ethers.utils.parseEther(depositAmount),
      });
      await tx.wait();
      alert("✅ Deposit Successful!");
      setDepositAmount("");

      await axios.post(`${API_URL}/api/evm-tx-log`, {
        userAddress: address,
        direction: "deposit",
        token: "ETH",
        amount: depositAmount,
        txHash: tx.hash,
        ip: null,
        source: "frontend"
      });

      await axios.post(`${API_URL}/api/balances/update`, {
        evmAddress: address,
        coin: "ETH",
        amount: depositAmount,
      });
    } catch (err) {
      console.error("Deposit failed:", err);
      alert("❌ Deposit failed");
    }
  };

 return (
  <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center p-4">
    <div className="relative w-full max-w-2xl p-8 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl text-white animate-fade-in">

      {/* Decorative SVG pulse */}
      <svg className="absolute -top-8 -right-8 w-24 h-24 text-pink-400/30 animate-pulse" fill="none" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="80" fill="currentColor" />
      </svg>

      <h2 className="text-3xl font-bold text-center mb-8 tracking-wide">💸 Receive Payment</h2>

      {address ? (
        <div className="space-y-8">

          {/* Wallet Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/10 border border-white/20 p-4 rounded-xl shadow">
              <p className="text-sm text-white/70 mb-1">Wallet Address</p>
              <p className="font-mono break-all">{address}</p>
            </div>
            <div className="bg-white/10 border border-white/20 p-4 rounded-xl shadow">
              <p className="text-sm text-white/70 mb-1">Username</p>
              <p>{username || "Not set"}</p>
              <p className="mt-2 text-sm text-white/70">Account #: <span className="font-mono">{accountNumber}</span></p>
            </div>
          </div>

          {/* QR Code */}
          <div className="text-center bg-white/10 border border-white/20 p-6 rounded-xl shadow-md">
            <QRCodeCanvas value={qrData} size={180} />
            <p className="mt-4 text-sm text-white/60">Scan this QR to pay via wallet</p>
          </div>

          {/* Deposit Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">⬆️ Deposit ETH</h3>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <input
                type="number"
                placeholder="Amount in ETH"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-green-400 w-full sm:w-40"
              />
              <button
                onClick={handleDeposit}
                className="bg-gradient-to-r from-green-400 to-teal-500 hover:scale-[1.02] transition-transform text-white px-6 py-3 rounded-xl font-semibold shadow"
              >
                Deposit
              </button>
            </div>
          </div>

          {/* QR Scanner */}
          <div>
            <button
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:scale-[1.02] transition-transform text-white px-6 py-3 rounded-xl font-semibold shadow"
              onClick={() => setScanning(!scanning)}
            >
              {scanning ? "🛑 Stop Scanner" : "📷 Scan QR Code"}
            </button>

            {scanning && (
              <div className="mt-6 bg-black/30 p-4 rounded-lg border border-white/20 shadow">
                <QrScanner
                  delay={300}
                  onError={handleError}
                  onScan={handleScan}
                  style={{ width: "100%" }}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-center text-white/70 text-sm">⚠️ Please connect your wallet to view payment details.</p>
      )}
    </div>
  </div>
);

}
