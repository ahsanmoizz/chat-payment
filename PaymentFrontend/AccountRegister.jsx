import React ,{ useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode.react";
import { ethers } from "ethers";
import { useBiconomyWallet } from "./hooks/useBiconomyWallet";
import UserRegistrationABI from "./UserRegistrationABI.json";
import * as faceapi from "face-api.js";
import { USER_REG_CONTRACT_ADDRESS } from "./constants";

function Register() {
  const { smartAccount, address } = useBiconomyWallet();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [qrCodeData, setQRCodeData] = useState("");
  const [userType, setUserType] = useState("single");
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("");
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const videoRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");

      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      if (videoRef.current) videoRef.current.srcObject = stream;
    })();
  }, []);

  const registerUser = async () => {
    try {
      if (!smartAccount || !address) return setMessage("⏳ Smart account not ready...");
      if (!name || !email || !phone || !passphrase || !username)
        return setMessage("⚠️ All fields are required!");

      setRegistering(true);

      const contract = new ethers.Contract(
        USER_REG_CONTRACT_ADDRESS,
        UserRegistrationABI,
        await smartAccount.getSigner()
      );

      // ✅ Check if already registered
      let existing;
      try {
        existing = await contract.getAccountDetails(address);
      } catch {}

      if (existing?.exists) {
        setMessage("🚫 Account already exists. Redirecting to login...");
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      const tx = await contract.createAccount(name, email, username, phone, "IN", passphrase);
      await tx.wait();

      const userDetails = await contract.getAccountDetails(address);
      const acctNum = userDetails.accountNumber.padStart(24, "0");
      const qrValue = `app://pay?acct=${acctNum}`;

      setAccountNumber(acctNum);
      setQRCodeData(qrValue);

      // 🔐 Face Registration
      await registerFaceHash();

      if (faceRegistered) {
        localStorage.setItem("userSession", "true");
        localStorage.setItem("userType", userType);
        localStorage.setItem("wallet", address);
        localStorage.setItem("accountNumber", acctNum);
        localStorage.setItem("qrCode", qrValue);
        localStorage.setItem("username", username);
        setMessage("✅ Registration complete!");

        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      }

    } catch (error) {
      console.error(error);
      setMessage("❌ Registration failed: " + error.message);
    } finally {
      setRegistering(false);
    }
  };

  const registerFaceHash = async () => {
    try {
      const detections = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) {
        alert("❌ Face not detected. Please try again.");
        return false;
      }

      const vector = Array.from(detections.descriptor);
      const salted = `${vector.join(",")}:${address}`;
      const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(salted));

      const signer = await smartAccount.getSigner();
      const faceContract = new ethers.Contract(
        USER_REG_CONTRACT_ADDRESS,
        UserRegistrationABI,
        signer
      );

      const tx = await faceContract.setFaceHash(hash);
      await tx.wait();
      alert("✅ Face registered successfully!");
      setFaceRegistered(true);
      return true;
    } catch (err) {
      console.error("Face registration failed:", err);
      alert("❌ Facial registration failed. Please retry.");
      setFaceRegistered(false);
      return false;
    }
  };

  return (
  <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center p-4">
    <div className="relative w-full max-w-lg p-8 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl text-white animate-fade-in">

      {/* Decorative glowing SVG */}
      <svg className="absolute -top-10 -right-10 w-32 h-32 text-pink-500/30 animate-pulse" fill="none" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="80" fill="currentColor" />
      </svg>

      <h2 className="text-3xl font-bold text-center mb-6 tracking-wide">📝 Create Your Account</h2>

      <div className="bg-yellow-300/20 text-yellow-100 border border-yellow-400/20 px-4 py-3 rounded-lg text-sm mb-6">
        ⚠️ After account creation, your identity details (Name, Email, Phone, Username) cannot be modified for security reasons.
      </div>

      <select
        value={userType}
        onChange={(e) => setUserType(e.target.value)}
        className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all mb-3"
      >
        <option value="single">Single User</option>
        <option value="corporate">Corporate</option>
      </select>

      <input
        type="text"
        placeholder="Preferred Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all mb-3"
      />
      <input
        type="text"
        placeholder="Name"
        onChange={(e) => setName(e.target.value)}
        className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all mb-3"
      />
      <input
        type="email"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all mb-3"
      />
      <input
        type="text"
        placeholder="Phone"
        onChange={(e) => setPhone(e.target.value)}
        className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all mb-3"
      />
      <input
        type="password"
        placeholder="Passphrase"
        onChange={(e) => setPassphrase(e.target.value)}
        className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all mb-6"
      />

      <button
        onClick={registerUser}
        disabled={registering}
        className={`w-full py-3 px-6 rounded-xl font-semibold shadow-lg transition-transform ${
          registering
            ? "bg-gray-500 cursor-not-allowed"
            : "bg-gradient-to-r from-green-400 to-teal-500 hover:scale-[1.02]"
        }`}
      >
        {registering ? "Registering..." : "Register"}
      </button>

      {message && (
        <p className="mt-4 text-sm text-pink-200">{message}</p>
      )}

      <div className="mt-10">
        <h3 className="text-lg font-bold mb-3">📷 Facial Registration (Mandatory)</h3>
        <video
          ref={videoRef}
          autoPlay
          muted
          width={320}
          height={240}
          className="rounded-lg border border-white/20 w-full bg-black/20"
        />
      </div>

      {qrCodeData && (
        <div className="mt-10 text-center">
          <h3 className="font-medium text-lg mb-2">🧾 Account Number</h3>
          <p className="mb-2 text-sm bg-white/10 px-3 py-2 inline-block rounded border border-white/20">{accountNumber}</p>
          <div className="mt-2 flex justify-center">
            <QRCode value={qrCodeData} size={180} />
          </div>
        </div>
      )}
    </div>
  </div>
);

}

export default Register;
