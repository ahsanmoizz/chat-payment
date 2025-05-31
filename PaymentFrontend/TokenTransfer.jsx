import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ethers } from "ethers";
import { QRCodeCanvas } from "qrcode.react";
import QrScanner from "react-qr-scanner";
import { supportedTokens } from "./utils/tokens";
import { useBiconomyWallet } from "./hooks/useBiconomyWallet";
import MultiAssetWalletABI from "./ContractABI.json";
import { MULTI_ASSET_WALLET_ADDRESS } from "./constants";
import axios from "axios";
import UserRegistrationABI from "./UserRegistrationABI.json";
import { USER_REG_CONTRACT_ADDRESS } from "./constants";

const API_URL = process.env.REACT_APP_API_URL ;
function isNonEvmToken(symbol) {
  const nonEvmList = ["BTC", "XRP", "DOGE", "SOL", "LTC", "ADA", "DOT", "ATOM", "XLM", "BCH"];
  return nonEvmList.includes(symbol.toUpperCase());
}

export default function TokenTransfer() {
  const { smartAccount, address } = useBiconomyWallet();
  const [contract, setContract] = useState(null);
  const [userRegContract, setUserRegContract] = useState(null);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("ETH");
  const [txHash, setTxHash] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const location = useLocation();
  const [delay, setDelay] = useState("0");

  useEffect(() => {
    const initContracts = async () => {
      if (!smartAccount) return;

      try {
        const signer = await smartAccount.getSigner();
        if (!signer) return;

        const walletInstance = new ethers.Contract(
          MULTI_ASSET_WALLET_ADDRESS,
          MultiAssetWalletABI,
          signer
        );
        setContract(walletInstance);

        const userRegInstance = new ethers.Contract(
          USER_REG_CONTRACT_ADDRESS,
          UserRegistrationABI,
          signer
        );
        setUserRegContract(userRegInstance);

        // ✅ Fetch correct accountNumber for QR code
        const userDetails = await userRegInstance.getAccountDetails(address);
        setAccountNumber(userDetails.accountNumber);

      } catch (err) {
        console.error("Error initializing contracts:", err);
      }
    };

    initContracts();
  }, [smartAccount, address]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const acct = params.get("acct");
    const amt = params.get("amt");
    const tokenParam = params.get("token");

    if (acct) setRecipient(acct);
    if (amt) setAmount(amt);
    if (tokenParam) {
      const tok = supportedTokens.find(t => t.symbol === tokenParam.toUpperCase());
      if (tok) setSelectedToken(tok.symbol);
    }
  }, [location.search]);

  const handleScan = (data) => {
    if (data) {
      try {
        const url = new URL(data);
        const acct = url.searchParams.get("acct");
        if (acct) setRecipient(acct);
        setShowScanner(false);
      } catch (err) {
        console.error("Invalid QR format:", err);
      }
    }
  };

  const handleError = (err) => {
    console.error("QR Scan Error:", err);
    setShowScanner(false);
  };

  const resolveRecipient = async (input) => {
    if (!contract || !userRegContract) return input;

    if (input.startsWith("ACCT-")) {
      return await userRegContract.getAddressByAccountNumber(input);
    }

    if (input.includes("@")) {
      return await userRegContract.getAddressByUsername(input);
    }

    return input;
  };

  const handleTransfer = async () => {
    if (!contract || !address) return alert("Connect Wallet First!");

    try {
      const resolvedAddress = await resolveRecipient(recipient);
      const tokenObj = supportedTokens.find(t => t.symbol === selectedToken);

      if (delay !== "0") {
        await axios.post(`${API_URL}/api/delayed-transfer`, {
          sender: address,
          recipient: resolvedAddress,
          token: tokenObj.symbol,
          amount,
          delayMinutes: parseInt(delay),
          isEvm: !isNonEvmToken(tokenObj.symbol),
        });

        alert("✅ Transfer scheduled!");
        return;
      } else{
      // ✅ Balance check (only for EVM tokens)
      if (!isNonEvmToken(tokenObj.symbol)) {
        const rawBalance = await contract.getBalance(tokenObj.address, address);
        const parsedAmount = ethers.utils.parseUnits(amount, tokenObj.decimals);
        if (rawBalance.lt(parsedAmount)) {
          return alert("❌ Insufficient balance");
        }
      }

      let tx;
      if (tokenObj.symbol === "ETH") {
        tx = await contract.transferETH(resolvedAddress, ethers.utils.parseEther(amount));
      } else {
        tx = await contract.transferERC20(
          tokenObj.address,
          resolvedAddress,
          ethers.utils.parseUnits(amount, tokenObj.decimals)
        );
      }

      await tx.wait();
      setTxHash(tx.hash);
      alert("✅ Transfer successful!");

        await axios.post(`${API_URL}/api/evm-tx-log`, {
          userAddress: address,
          direction: "transfer",
          token: tokenObj.symbol,
          amount,
          txHash: tx.hash,
          ip: null,
          source: "frontend"
        });
      }

      await axios.post(`${API_URL}/api/balances/update`, {
        evmAddress: address,
        coin: selectedToken,
        amount: "0",
      });

    } catch (error) {
      console.error(error);
      alert("❌ Transfer failed: " + error.message);
    }
  };

  const qrValue = accountNumber ? `app://pay?acct=${accountNumber}` : "";
return (
  <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex justify-center items-start py-12 px-4 text-white">
    <div className="relative w-full max-w-xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 animate-fade-in">

      {/* Glowing SVG */}
      <svg className="absolute -top-8 -right-8 w-24 h-24 text-purple-500/30 animate-pulse" fill="none" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="80" fill="currentColor" />
      </svg>

      <h2 className="text-3xl font-bold mb-8 text-center tracking-wide">🚀 Send Tokens</h2>

      <div className="space-y-5">

        {/* Recipient */}
        <input
          type="text"
          placeholder="Recipient (Username / Account / Wallet)"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
        />

        {/* Token Select */}
        <select
          value={selectedToken}
          onChange={(e) => setSelectedToken(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        >
          {supportedTokens.map(token =>
            token.symbol !== "ETH" && (
              <option key={token.symbol} value={token.symbol}>
                {token.name} ({token.symbol})
              </option>
            )
          )}
        </select>

        {/* Amount */}
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
        />

        {/* Delay Select */}
        <select
          value={delay}
          onChange={(e) => setDelay(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
        >
          <option value="0">Immediate</option>
          <option value="1">1 minute</option>
          <option value="5">5 minutes</option>
          <option value="30">30 minutes</option>
        </select>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <button
            onClick={handleTransfer}
            className="flex-1 py-3 px-6 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:scale-[1.02] transition-transform shadow-md"
          >
            Send {selectedToken}
          </button>
          <button
            onClick={() => setShowScanner(true)}
            className="flex-1 py-3 px-6 rounded-xl font-semibold bg-white/10 border border-white/20 hover:bg-white/20 transition"
          >
            📷 Scan QR
          </button>
        </div>

        {/* Tx Hash */}
        {txHash && (
          <p className="text-green-300 text-sm mt-2 break-words">
            ✅ Tx Hash:&nbsp;
            <a
              href={`https://etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-green-200"
            >
              {txHash}
            </a>
          </p>
        )}

        {/* QR Code Display */}
        {address && accountNumber && (
          <div className="mt-8 text-center bg-white/10 border border-white/20 p-6 rounded-xl">
            <h3 className="text-lg font-semibold mb-2">📤 My Account QR</h3>
            <QRCodeCanvas value={qrValue} size={160} />
            <p className="mt-3 text-sm text-white/60">Share this QR to receive payments</p>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white text-black p-6 rounded-2xl shadow-xl w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4 text-center">📷 Scan QR</h3>
            <QrScanner
              delay={300}
              onError={handleError}
              onScan={handleScan}
              style={{ width: "100%" }}
            />
            <button
              className="mt-6 w-full py-3 rounded-xl font-semibold bg-red-500 text-white hover:bg-red-600 transition"
              onClick={() => setShowScanner(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
);

}
