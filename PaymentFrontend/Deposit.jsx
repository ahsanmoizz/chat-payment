import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import QrReader from "react-qr-reader";
import { ethers } from "ethers";
import { useBiconomyWallet } from "./hooks/useBiconomyWallet";
import ContractABI from "../abi/YourContractABI.json";
import axios from "axios";

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

export default function Receive() {
  const { smartAccount, address } = useBiconomyWallet();
  const [scanning, setScanning] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [username, setUsername] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const navigate = useNavigate();

  const validUsername = username && username !== "Not set";
  const qrData = validUsername
    ? `app://pay?user=${username}&amt=0&token=ETH`
    : accountNumber
    ? `app://pay?acct=${accountNumber}&amt=0&token=ETH`
    : "";

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

      await axios.post("http://localhost:5000/api/evm-tx-log", {
        userAddress: address,
        direction: "deposit",
        token: "ETH",
        amount: depositAmount,
        txHash: tx.hash,
        ip: null,
        source: "frontend"
      });

      await axios.post("http://localhost:5000/api/balances/update", {
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
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Receive Payment</h2>

      {address ? (
        <div className="space-y-6">
          <div>
            <p><strong>Wallet Address:</strong> {address}</p>
            <p><strong>Username:</strong> {username || "Not set"}</p>
            <p><strong>Account Number:</strong> {accountNumber}</p>
          </div>

          <div className="border p-4 rounded bg-white">
            <QRCodeCanvas value={qrData} size={180} />
            <p className="mt-2 text-sm text-gray-600">Scan to pay (Tap-to-Pay)</p>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-2">Deposit ETH</h3>
            <div className="flex items-center">
              <input
                type="number"
                placeholder="Amount in ETH"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="border p-2 rounded w-40"
              />
              <button
                onClick={handleDeposit}
                className="bg-green-600 text-white px-4 py-2 ml-3 rounded hover:bg-green-700"
              >
                Deposit
              </button>
            </div>
          </div>

          <div className="mt-8">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded"
              onClick={() => setScanning(!scanning)}
            >
              {scanning ? "Stop Scanner" : "Scan QR Code"}
            </button>

            {scanning && (
              <div className="mt-4">
                <QrReader
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
        <p>Please connect your wallet to see receive info.</p>
      )}
    </div>
  );
}
