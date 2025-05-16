import { useState, useEffect, useRef } from "react";
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
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Register</h2>

      <div className="bg-yellow-100 text-yellow-800 p-3 rounded mb-4 text-sm">
        ⚠️ After account creation, your identity details (Name, Email, Phone, Username) cannot be modified for security reasons.
      </div>

      <select
        value={userType}
        onChange={(e) => setUserType(e.target.value)}
        className="border px-3 py-2 rounded w-full mb-2"
      >
        <option value="single">Single User</option>
        <option value="corporate">Corporate</option>
      </select>

      <input type="text" placeholder="Preferred Username" value={username} onChange={(e) => setUsername(e.target.value)} className="border p-2 w-full mb-2" />
      <input type="text" placeholder="Name" onChange={(e) => setName(e.target.value)} className="border px-3 py-2 rounded w-full mb-2" />
      <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} className="border px-3 py-2 rounded w-full mb-2" />
      <input type="text" placeholder="Phone" onChange={(e) => setPhone(e.target.value)} className="border px-3 py-2 rounded w-full mb-2" />
      <input type="password" placeholder="Passphrase" onChange={(e) => setPassphrase(e.target.value)} className="border px-3 py-2 rounded w-full mb-4" />

      <button
        onClick={registerUser}
        disabled={registering}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        {registering ? "Registering..." : "Register"}
      </button>

      <p className="mt-3 text-sm">{message}</p>

      <div className="mt-6">
        <h3 className="text-lg font-bold mb-2">Facial Registration (Mandatory)</h3>
        <video ref={videoRef} autoPlay muted width={320} height={240} className="rounded border" />
      </div>

      {qrCodeData && (
        <div className="mt-6">
          <h3 className="font-medium">Account Number: {accountNumber}</h3>
          <QRCode value={qrCodeData} size={180} />
        </div>
      )}
    </div>
  );
}

export default Register;
