import { useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { useBiconomyWallet } from "./hooks/useBiconomyWallet";
import ContractABI from "./ContractABI.json";
import { supportedTokens } from "./utils/tokens";

const CONTRACT_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

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
        await axios.post("https://dummy-api.yourdomain.com/api/evm-tx-log", {
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
    } else {
      try {
        // ✅ 1. Check balance first
        const { data } = await axios.get(`https://dummy-api.yourdomain.com/api/balances/update/${address}`);
        const tokenBalance = data?.balances?.[selectedToken] || "0";
  
        if (parseFloat(tokenBalance) < parseFloat(amount)) {
          return alert("❌ Insufficient balance for withdrawal.");
        }
  
        // ✅ 2. Proceed with withdrawal
        await axios.post("http://dummy-api.yourdomain.com/api/bridge-withdraw", {
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
    }
  };
  

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Withdraw</h2>

      <select
        className="border w-full mb-3 p-2 rounded"
        value={selectedToken}
        onChange={(e) => setSelectedToken(e.target.value)}
      >
        {supportedTokens.map((t) => (
          <option key={t.symbol} value={t.symbol}>
            {t.name} ({t.symbol})
          </option>
        ))}
      </select>

      <input
        type="number"
        placeholder="Amount"
        className="border p-2 w-full mb-2 rounded"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <input
        type="text"
        placeholder="Destination Address"
        className="border p-2 w-full mb-4 rounded"
        value={destinationAddress}
        onChange={(e) => setDestinationAddress(e.target.value)}
      />

      <button
        onClick={withdraw}
        className="bg-red-500 text-white px-4 py-2 rounded w-full"
      >
        Withdraw {selectedToken}
      </button>
    </div>
  );
};

export default Withdraw;
