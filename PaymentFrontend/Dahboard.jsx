import React ,{ useEffect, useState } from "react";
import { ethers } from "ethers";
import { useBiconomyWallet } from "./hooks/useBiconomyWallet";
import { QRCodeCanvas } from "qrcode.react";
import { supportedTokens } from "./utils/tokens";
import MultiAssetWalletABI from "./ContractABI.json";
import { MULTI_ASSET_WALLET_ADDRESS, USER_REG_CONTRACT_ADDRESS } from "./constants";
import axios from "axios";
import UserRegistrationABI from "./UserRegistrationABI.json";

const API_URL = process.env.REACT_APP_API_URL ;
export default function Dashboard() {
  const { smartAccount, address } = useBiconomyWallet();
  const [accountNumber, setAccountNumber] = useState("");
  const [contract, setContract] = useState(null);
  const [platformWallet, setPlatformWallet] = useState("");
  const [ethBalance, setEthBalance] = useState("0");
  const [tokenBalances, setTokenBalances] = useState([]);
  const [nonEvmBalances, setNonEvmBalances] = useState({});
  const [walletAddresses, setWalletAddresses] = useState({});
  const [username, setUsername] = useState("");
  const [faceVerified, setFaceVerified] = useState(false);

  useEffect(() => {
    const loadContractAndFaceCheck = async () => {
      if (!smartAccount || !address) return;

      const signer = await smartAccount.getSigner();

      // ✅ Check face registration
      const userRegContract = new ethers.Contract(
        USER_REG_CONTRACT_ADDRESS,
        UserRegistrationABI,
        signer
      );

      const faceHash = await userRegContract.faceHash(address);

      if (faceHash === ethers.constants.HashZero) {
        alert("❌ Face not registered. Please complete facial verification first.");
        window.location.href = "/register";
        return;
      }
      setFaceVerified(true);

      // ✅ Load wallet contract
      const walletInstance = new ethers.Contract(
        MULTI_ASSET_WALLET_ADDRESS,
        MultiAssetWalletABI,
        signer
      );
      setContract(walletInstance);
      setPlatformWallet(address);

      const details = await userRegContract.getAccountDetails(address);
      setUsername(details.username);
      setAccountNumber(details.accountNumber);
    };

    loadContractAndFaceCheck();
  }, [smartAccount, address]);

  const fetchBalances = async () => {
    if (!contract || !address) return;

    try {
    const rawEth = await contract.getBalance(ethers.constants.AddressZero, address);
setEthBalance(ethers.utils.formatEther(rawEth));

const balances = [];
for (let token of supportedTokens.filter(t => t.type === "evm")) {
  try {
    const raw = await contract.getBalance(token.address, address);
    balances.push({
      token: token.symbol,
      amount: ethers.utils.formatUnits(raw, token.decimals),
    });
  } catch (err) {
    console.warn(`Error fetching ${token.symbol} balance`, err);
  }
}
setTokenBalances(balances);


      const res = await axios.get(`${API_URL}/api/balances/${address}`);
      if (res.data?.balances) {
        setNonEvmBalances(res.data.balances);
      }

      const walletRes = await axios.get(`${API_URL}/api/wallet/${address}`);
      setWalletAddresses(walletRes.data.data);
    } catch (err) {
      console.error("Failed to fetch balances", err);
    }
  };

  useEffect(() => {
    if (contract && address) {
      fetchBalances();
    }
  }, [contract, address]);

  if (!faceVerified) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold">🔒 Verifying face identity...</h2>
      </div>
    );
  }
return (
  <div className="min-h-screen flex bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white">
    <Sidebar />

    <div className="flex-1 p-8 overflow-y-auto">
      <div className="relative bg-white/5 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10 animate-fade-in">
        <svg className="absolute -top-10 -left-10 w-32 h-32 text-indigo-500/30 animate-pulse" fill="none" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="80" fill="currentColor" />
        </svg>

        <h2 className="text-3xl font-bold tracking-wide mb-6">📊 Wallet Dashboard</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/10 p-4 rounded-xl border border-white/20 shadow">
            <p className="text-sm mb-1 text-white/70">Smart Wallet Address</p>
            <p className="font-mono break-all">{platformWallet}</p>
          </div>

          <div className="bg-white/10 p-4 rounded-xl border border-white/20 shadow">
            <p className="text-sm mb-1 text-white/70">Username</p>
            <p className="font-semibold">{username || "Not set"}</p>
          </div>
        </div>

        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 rounded-xl shadow-lg border border-white/20">
            <h3 className="text-lg font-semibold mb-2">💰 Deposited ETH</h3>
            <p className="text-2xl font-bold">{ethBalance} ETH</p>
          </div>

          <div className="bg-white/10 p-6 rounded-xl border border-white/20 shadow">
            <h3 className="text-lg font-semibold mb-3">🧾 Account Info</h3>
            <p className="text-sm"><strong>Wallet:</strong> {platformWallet}</p>
            <p className="text-sm"><strong>Account #:</strong> {accountNumber || "Loading..."}</p>
            <div className="mt-4">
              <QRCodeCanvas value={platformWallet} size={160} />
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white/10 p-6 rounded-xl border border-white/20 shadow">
          <h3 className="text-lg font-semibold mb-3">📦 EVM Token Balances</h3>
          {tokenBalances.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {tokenBalances.map((token) => (
                <li key={token.token} className="border-b border-white/10 pb-1">
                  {token.token}: {token.amount}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-white/70">No tokens found.</p>
          )}
        </div>

        <div className="mt-6 bg-white/10 p-6 rounded-xl border border-white/20 shadow">
          <h3 className="text-lg font-semibold mb-3">🌐 Non-EVM Token Balances</h3>
          <ul className="space-y-1 text-sm">
            {Object.entries(nonEvmBalances).map(([coin, amt]) => (
              <li key={coin} className="border-b border-white/10 pb-1">
                {coin}: {amt}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 bg-white/10 p-6 rounded-xl border border-white/20 shadow">
          <h3 className="text-lg font-semibold mb-3">🔐 Non-EVM Wallet Addresses</h3>
          <ul className="space-y-1 text-sm">
            {Object.entries(walletAddresses).map(([coin, addr]) =>
              coin !== "evmAddress" ? (
                <li key={coin} className="border-b border-white/10 pb-1">
                  {coin.toUpperCase()}: <span className="font-mono">{addr}</span>
                </li>
              ) : null
            )}
          </ul>
        </div>

        <div className="mt-8 text-center">
          <h3 className="text-lg font-bold mb-2">➡️ Proceed to Withdrawal</h3>
          <p className="text-white/70 mb-4">You can withdraw funds to an exchange or cross-chain network.</p>
          <a
            href="/withdraw"
            className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-indigo-600 hover:to-blue-500 transition-all text-white px-6 py-3 rounded-xl font-semibold shadow-md"
          >
            Go to Withdraw
          </a>
        </div>
      </div>
    </div>
  </div>
);

}
