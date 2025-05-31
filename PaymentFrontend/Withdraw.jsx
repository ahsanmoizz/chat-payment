import React ,{ useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { useBiconomyWallet } from "./hooks/useBiconomyWallet";
import ContractABI from "./ContractABI.json";
import { supportedTokens } from "./utils/tokens";

const API_URL = process.env.REACT_APP_API_URL ;
const CONTRACT_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
function isNonEvmToken(symbol) {
  const nonEvmList = ["BTC", "XRP", "DOGE", "SOL", "LTC", "ADA", "DOT", "ATOM", "XLM", "BCH"];
  return nonEvmList.includes(symbol.toUpperCase());
}

const Withdraw = () => {
  const { smartAccount, address } = useBiconomyWallet();
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("ETH");
  const [destinationAddress, setDestinationAddress] = useState("");

  const getContract = () => {
    const signer = smartAccount.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, ContractABI, signer);
  };

  const withdraw = async () => {
    if (!smartAccount) return alert("Wallet not ready.");
    if (!destinationAddress) return alert("Provide a destination address.");
    if (Number(amount) <= 0) return alert("Invalid amount.");
  
if (selectedToken === "ETH") {
  try {
    const contract = getContract();
    const tx = await contract.withdrawETH(ethers.utils.parseEther(amount));
    await tx.wait();
    alert("✅ ETH Withdrawal Successful");
    await axios.post(`${API_URL}/api/evm-tx-log`, {
      userAddress: address,
      direction: "withdraw",
      token: "ETH",
      amount,
      txHash: tx.hash,
      ip: null, // auto from backend
      source: "frontend"
    });
  } catch (err) {
    console.error(err);
    alert("❌ ETH Withdrawal Failed");
  }
} else if (isNonEvmToken(selectedToken)) {
  try {
    // ✅ 1. Check balance first
    const { data } = await axios.get(`${API_URL}/api/balances/update/${address}`);
    const tokenBalance = data?.balances?.[selectedToken] || "0";

    if (parseFloat(tokenBalance) < parseFloat(amount)) {
      return alert("❌ Insufficient balance for withdrawal.");
    }

    // ✅ 2. Proceed with withdrawal
    await axios.post(`${API_URL}/api/bridge-withdraw`, {
      evmAddress: address,
      nonEvmCoin: selectedToken,
      destinationAddress,
      amount,
    });

    alert("✅ Non-EVM Withdrawal Initiated");
  } catch (err) {
    console.error(err);
    alert("❌ Non-EVM Withdrawal Failed");
  }
} else {
  try {const token = supportedTokens.find(t => t.symbol === selectedToken);
const contract = getContract();
const userBalance = await contract.getBalance(token.address, address); // ✅ correct order
const parsedAmount = ethers.utils.parseUnits(amount, token.decimals);

if (userBalance.lt(parsedAmount)) {
  return alert("❌ Insufficient balance");
}

// Continue with withdrawal...
const tx = await contract.withdrawERC20(token.address, parsedAmount);
await tx.wait();


    alert(`✅ ${selectedToken} Withdrawal Successful`);

    await axios.post(`${API_URL}/api/evm-tx-log`, {
      userAddress: address,
      direction: "withdraw",
      token: selectedToken,
      amount,
      txHash: tx.hash,
      ip: null,
      source: "frontend",
    });

    await axios.post(`${API_URL}/api/balances/update`, {
      evmAddress: address,
      coin: selectedToken,
      amount: "0",
    });

  } catch (err) {
    console.error(err);
    alert(`❌ ${selectedToken} Withdrawal Failed`);
  }
}
return (
  <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex justify-center items-center p-6 text-white">
    <div className="relative w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-8 animate-fade-in">

      {/* Decorative glow SVG */}
      <svg className="absolute -top-8 -left-8 w-24 h-24 text-red-400/20 animate-pulse" fill="none" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="80" fill="currentColor" />
      </svg>

      <h2 className="text-3xl font-bold text-center mb-6 tracking-wide">💸 Withdraw Funds</h2>

      {/* Token Selector */}
      <select
        className="w-full px-4 py-3 mb-4 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-red-400 transition-all"
        value={selectedToken}
        onChange={(e) => setSelectedToken(e.target.value)}
      >
        {supportedTokens.map((t) => (
          <option key={t.symbol} value={t.symbol}>
            {t.name} ({t.symbol})
          </option>
        ))}
      </select>

      {/* Amount */}
      <input
        type="number"
        placeholder="Amount"
        className="w-full px-4 py-3 mb-4 rounded-lg bg-white/10 border border-white/20 placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      {/* Destination Address */}
      <input
        type="text"
        placeholder="Destination Wallet Address"
        className="w-full px-4 py-3 mb-6 rounded-lg bg-white/10 border border-white/20 placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all"
        value={destinationAddress}
        onChange={(e) => setDestinationAddress(e.target.value)}
      />

      {/* Withdraw Button */}
      <button
        onClick={withdraw}
        className="w-full py-3 px-6 rounded-xl font-semibold shadow-lg bg-gradient-to-r from-red-500 to-pink-500 hover:scale-[1.02] transition-transform"
      >
        Withdraw {selectedToken}
      </button>
    </div>
  </div>
);

  };
};
export default Withdraw;
