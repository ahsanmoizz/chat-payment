import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import UserRegistrationABI from "./UserRegistrationABI.json";
import { useWeb3Auth } from "./hooks/web3hooks";
import * as faceapi from 'face-api.js';
import { USER_REG_CONTRACT_ADDRESS } from "./constants";

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
  <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center p-4">
    <div className="relative w-full max-w-lg p-8 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl text-white transition-all duration-300 animate-fade-in">
      {/* Decorative glowing SVG */}
      <svg className="absolute -top-10 -right-10 w-32 h-32 text-purple-500/30 animate-pulse" fill="none" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="80" fill="currentColor" />
      </svg>

      <h2 className="text-3xl font-bold text-center mb-6 tracking-wide">🔐 Secure Wallet Login</h2>

      {!address ? (
        <button
          onClick={login}
          className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white py-3 px-6 rounded-xl font-semibold hover:scale-[1.02] active:scale-[.98] transition-transform shadow-lg"
        >
          Connect with Web3Auth
        </button>
      ) : (
        <>
          <div className="mb-6">
            <p className="text-sm text-green-300 mb-1">Connected Wallet:</p>
            <p className="font-mono bg-white/10 px-3 py-2 rounded-md text-sm break-all border border-white/20">
              {address}
            </p>
          </div>

          {!useFace ? (
            <button
              onClick={() => setUseFace(true)}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-500 py-3 px-6 rounded-xl font-semibold hover:scale-[1.02] transition-transform shadow-lg mb-4"
            >
              Start Face Verification
            </button>
          ) : (
            <div className="flex flex-col items-center">
              <video
                ref={videoRef}
                autoPlay
                muted
                width={320}
                height={240}
                className="rounded-lg border border-white/20 mb-4"
              />
              <button
                onClick={loginWithFace}
                disabled={verifying}
                className={`w-full py-3 px-6 rounded-xl font-semibold shadow-lg transition-all ${
                  verifying
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-400 to-teal-500 hover:scale-[1.02]"
                }`}
              >
                {verifying ? "Verifying..." : "Verify Face"}
              </button>
            </div>
          )}

          {/* Manual Backup Login */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">🔑 Backup Manual Login</h3>
            <input
              type="text"
              placeholder="Enter Passphrase or Account Number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all mb-3"
            />
            <button
              onClick={loginUser}
              disabled={!faceLoginSuccess}
              className={`w-full py-3 px-6 rounded-xl font-semibold shadow-lg transition-transform ${
                !faceLoginSuccess
                  ? "bg-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-slate-700 to-black hover:scale-[1.02]"
              }`}
            >
              Login with Passphrase/Account
            </button>
          </div>

          {/* Logout + Messages */}
          {address && localStorage.getItem("userSession") === "true" && (
  <button
    onClick={handleLogout}
    className="mt-6 text-sm text-red-300 underline hover:text-red-100"
  >
    🚪 Logout Wallet
  </button>
)}


          {message && <p className="mt-4 text-sm text-red-200">{message}</p>}

          {failedAttempts >= 3 && (
            <p className="mt-2 text-sm text-yellow-300 animate-pulse">
              ⚠️ Multiple failed login attempts detected.
            </p>
          )}
        </>
      )}
    </div>
  </div>
);

}

export default AccountLogin;
