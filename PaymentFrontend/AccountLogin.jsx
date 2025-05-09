import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import UserRegistrationABI from "./UserRegistrationABI.json";
import { useWeb3Auth } from "./hooks/web3hooks";
import * as faceapi from 'face-api.js';
import { USER_REG_CONTRACT_ADDRESS } from "../config/constants";

function AccountLogin() {
  const { login, logout, address, provider } = useWeb3Auth();
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const videoRef = useRef();
  const [useFace, setUseFace] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [faceLoginSuccess, setFaceLoginSuccess] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  useEffect(() => {
    if (!useFace) return;

    (async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');

      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      if (videoRef.current) videoRef.current.srcObject = stream;
    })();
  }, [useFace]);

  const loginUser = async () => {
    try {
      if (!input || input.trim().length < 3) {
        setMessage("⚠️ Please enter a valid passphrase or account number");
        return;
      }

      if (!provider) {
        setMessage("⚠️ Connect wallet first using Web3Auth");
        return;
      }

      const ethersProvider = new ethers.providers.Web3Provider(provider);
      const signer = ethersProvider.getSigner();
      const contract = new ethers.Contract(USER_REG_CONTRACT_ADDRESS, UserRegistrationABI, signer);

      let success = false;
      if (input.startsWith("ACCT-") || input.length >= 20) {
        success = await contract.loginWithAccountNumber(input);
      } else {
        success = await contract.loginWithPassphrase(input);
      }

      if (success) {
        if (!faceLoginSuccess) {
          setMessage("⚠️ Face verification required before login.");
          return;
        }
        setMessage("✅ Login successful!");
        localStorage.setItem("userSession", "true");
        localStorage.setItem("wallet", address);
        const userType = localStorage.getItem("userType") || "single";
        localStorage.setItem("userType", userType);
        navigate("/dashboard");
      } else {
        setFailedAttempts(prev => prev + 1);
        setMessage("❌ Login failed. Check input.");
      }
    } catch (error) {
      console.error(error);
      setMessage("❌ Login error: " + error.message);
    }
  };

  const loginWithFace = async () => {
    try {
      setVerifying(true);

      if (!provider || !address) {
        setMessage("⚠️ Connect wallet first using Web3Auth");
        setVerifying(false);
        return;
      }

      const detections = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) {
        setVerifying(false);
        alert("❌ Face not recognized. Try again.");
        return;
      }
  

      const vector = Array.from(detections.descriptor);
      const salted = `${vector.join(',')}:${address}`;
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(salted));

      const ethersProvider = new ethers.providers.Web3Provider(provider);
      const signer = ethersProvider.getSigner();
      const contract = new ethers.Contract(USER_REG_CONTRACT_ADDRESS, UserRegistrationABI, signer);

      const isMatch = await contract.verifyFace(hash);

      if (isMatch) {
        alert("✅ Face verified! Now you can login.");
        setFaceLoginSuccess(true);
        setMessage("✅ Face Verified! Proceed to login with passphrase/account.");
      } else {
        alert("❌ Face not matched.");
      }
    } catch (err) {
      console.error("Face login error:", err);
      alert("❌ Face login failed.");
    } finally {
      setVerifying(false);
    }
  };
 
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Login</h2>

      {!address ? (
        <button
          onClick={login}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Connect with Web3Auth
        </button>
      ) : (
        <div>
          <p className="mb-2">🔐 Connected Wallet: {address}</p>

          {/* 🔥 Mandatory Face Login */}
          {!useFace ? (
            <button
              onClick={() => setUseFace(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded"
            >
              Start Face Verification
            </button>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                muted
                width={320}
                height={240}
                className="rounded border mb-2"
              />
              <button
                onClick={loginWithFace}
                disabled={verifying}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                {verifying ? "Verifying..." : "Verify Face"}
              </button>
            </>
          )}
          
          <div className="mt-6">
            <h3 className="font-semibold mb-2">🔑 Backup Manual Login (After Face Verified)</h3>

            <input
              type="text"
              placeholder="Enter Passphrase or Account Number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="border px-3 py-2 rounded w-full mb-2"
            />

            <button
              onClick={loginUser}
              disabled={!faceLoginSuccess}
              className="bg-gray-700 text-white px-4 py-2 rounded"
            >
              Login with Passphrase/Account
            </button>
          </div>

          <button
            onClick={logout}
            className="ml-4 mt-4 text-sm text-red-500 underline block"
          >
            Logout Wallet
          </button>

          <p className="mt-3 text-sm text-red-600">{message}</p>
          {failedAttempts >= 3 && (
            <p className="mt-1 text-sm text-red-600">
              ⚠️ Multiple failed login attempts detected.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default AccountLogin;
