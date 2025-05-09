import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useBiconomyWallet } from "../hooks/useBiconomyWallet";
import { QRCodeCanvas } from "qrcode.react";
import { getAccountNumberFromAddress } from "../utils/accountUtils";
import { supportedTokens } from "../utils/tokens";
import MultiAssetWalletABI from "../abis/MultiAssetWallet.json";
import { MULTI_ASSET_WALLET_ADDRESS, USER_REG_CONTRACT_ADDRESS } from "../config/constants";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import UserRegistrationABI from "../abis/UserRegistrationABI.json";

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
      const rawEth = await contract.getBalance(address, ethers.constants.AddressZero);
      setEthBalance(ethers.utils.formatEther(rawEth));

      const balances = [];
      for (let token of supportedTokens) {
        try {
          const raw = await contract.getBalance(address, token.address);
          balances.push({
            token: token.symbol,
            amount: ethers.utils.formatUnits(raw, token.decimals),
          });
        } catch (err) {
          console.warn(`Error fetching ${token.symbol} balance`, err);
        }
      }
      setTokenBalances(balances);

      const res = await axios.get(`http://localhost:5000/api/balances/${address}`);
      if (res.data?.balances) {
        setNonEvmBalances(res.data.balances);
      }

      const walletRes = await axios.get(`/api/wallet/${address}`);
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
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 bg-gray-50">
        <h2 className="text-2xl font-bold mb-4">Wallet Dashboard</h2>

        <p className="mb-2">
          <strong>Smart Wallet Address:</strong> {platformWallet}
        </p>
        <p className="mb-2">
          <strong>Username:</strong> {username || "Not set"}
        </p>

        <div className="bg-gray-100 p-4 rounded mb-6">
          <h3 className="font-semibold mb-2">Deposited ETH</h3>
          <p>{ethBalance} ETH</p>
        </div>

        <div className="mt-4 p-4 border rounded bg-white">
          <p><strong>Wallet Address:</strong> {platformWallet}</p>
          <p><strong>Account Number:</strong> {accountNumber || "Loading..."}</p>
          <p className="mt-2"><strong>QR Code:</strong></p>
          <QRCodeCanvas value={platformWallet} size={160} />
        </div>

        <div className="bg-gray-100 p-4 rounded mt-6">
          <h3 className="font-semibold mb-2">EVM Token Balances</h3>
          {tokenBalances.length > 0 ? (
            <ul>
              {tokenBalances.map((token, idx) => (
                <li key={idx} className="border-b py-1">
                  {token.token}: {token.amount}
                </li>
              ))}
            </ul>
          ) : (
            <p>No tokens found.</p>
          )}
        </div>

        <div className="bg-gray-100 p-4 rounded mt-6">
          <h3 className="font-semibold mb-2">Non-EVM Token Balances</h3>
          <ul>
            {Object.entries(nonEvmBalances).map(([coin, amt]) => (
              <li key={coin} className="border-b py-1">
                {coin}: {amt}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-100 p-4 rounded mt-6">
          <h3 className="font-semibold mb-2">Your Non-EVM Wallet Addresses</h3>
          {Object.entries(walletAddresses).map(([coin, addr]) =>
            coin !== "evmAddress" ? (
              <p key={coin} className="text-sm border-b py-1">
                {coin.toUpperCase()}: <span className="font-mono">{addr}</span>
              </p>
            ) : null
          )}
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-bold mb-2">Proceed to Withdrawal</h3>
          <p className="mb-2">You can withdraw funds to an exchange or cross-chain network.</p>
          <a
            href="/withdraw"
            className="bg-blue-600 text-white px-4 py-2 rounded inline-block"
          >
            Go to Withdraw
          </a>
        </div>
      </div>
    </div>
  );
}
