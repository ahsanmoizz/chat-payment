import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ethers } from "ethers";
import { QRCodeCanvas } from "qrcode.react";
import QrReader from "react-qr-reader";
import { supportedTokens } from "./utils/tokens";
import { useBiconomyWallet } from "./hooks/useBiconomyWallet";
import MultiAssetWalletABI from "../abis/MultiAssetWallet.json";
import { MULTI_ASSET_WALLET_ADDRESS } from "../config/constants";
import axios from "axios";
import UserRegistrationABI from "../abis/UserRegistrationABI.json";
import { USER_REG_CONTRACT_ADDRESS } from "../config/constants";

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
        await axios.post("http://localhost:5000/api/delayed-transfer", {
          sender: address,
          recipient: resolvedAddress,
          token: tokenObj.symbol,
          amount,
          delayMinutes: parseInt(delay),
          isEvm: !isNonEvmToken(tokenObj.symbol),
        });

        alert("✅ Transfer scheduled!");
        return;
      } else {
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

        await axios.post("http://localhost:5000/api/evm-tx-log", {
          userAddress: address,
          direction: "transfer",
          token: tokenObj.symbol,
          amount,
          txHash: tx.hash,
          ip: null,
          source: "frontend"
        });
      }

      await axios.post("http://localhost:5000/api/balances/update", {
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
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Send Tokens</h2>

      <div className="space-y-4 max-w-md">
        <input
          type="text"
          placeholder="Recipient (Username / Account / Wallet)"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="border p-2 w-full rounded"
        />

        <select
          value={selectedToken}
          onChange={(e) => setSelectedToken(e.target.value)}
          className="border p-2 w-full rounded"
        >
          <option value="ETH">Ethereum (ETH)</option>
          {supportedTokens.map(token =>
            token.symbol !== "ETH" && (
              <option key={token.symbol} value={token.symbol}>
                {token.name} ({token.symbol})
              </option>
            )
          )}
        </select>

        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="border p-2 w-full rounded"
        />

        <select
          value={delay}
          onChange={(e) => setDelay(e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option value="0">Immediate</option>
          <option value="1">1 minute</option>
          <option value="5">5 minutes</option>
          <option value="30">30 minutes</option>
        </select>

        <div className="flex justify-between items-center">
          <button
            onClick={handleTransfer}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Send {selectedToken}
          </button>
          <button
            onClick={() => setShowScanner(true)}
            className="ml-4 border px-4 py-2 rounded hover:bg-gray-100"
          >
            Scan QR
          </button>
        </div>

        {txHash && (
          <p className="text-green-600 mt-2">
            Tx Hash:{" "}
            <a
              href={`https://etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              {txHash}
            </a>
          </p>
        )}

        {address && accountNumber && (
          <div className="mt-6 p-4 border rounded bg-gray-50">
            <h3 className="font-semibold mb-2">My Account QR</h3>
            <QRCodeCanvas value={qrValue} size={160} />
            <p className="mt-2 text-sm text-gray-600">
              Share this QR to receive payments
            </p>
          </div>
        )}
      </div>

      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">Scan QR</h3>
            <QrReader
              delay={300}
              onError={handleError}
              onScan={handleScan}
              style={{ width: "100%" }}
            />
            <button
              className="mt-4 w-full border py-2 rounded hover:bg-gray-100"
              onClick={() => setShowScanner(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
