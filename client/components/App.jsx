import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Communication App Components
import LoginRegisterPage from "./components/auth pages/LoginRegisterpage";
import WhatsAppLayout from "./components/whatsapplayout";
import SubscriptionPage from "./components/SubscriptionPage";

// Payment App Components
import Register from "../../PaymentFrontend/AccountRegister";
import Login from "../../PaymentFrontend/AccountLogin";
import Dashboard from "../../PaymentFrontend/Dahboard";
import Deposit from "../../PaymentFrontend/Deposit";
import Withdraw from "../../PaymentFrontend/Withdraw";
import TokenTransfer from "../../PaymentFrontend/TokenTransfer";
import Receive from "../../PaymentFrontend/Receive";
import MultiSig from "../../PaymentFrontend/MultiSig";
import Escrow from "../../PaymentFrontend/Escrow";
import Sidebar from "../../PaymentFrontend/Sidebar";
import TxViewer from "../../PaymentFrontend/TransactionViewer";
import TransferQueue from "../../PaymentFrontend/TransferQueue";
// ❌ Removed unused import: import { Web3Provider } from "./payment frontend/context/Web3Context";

// ✅ App Component
const App = () => {
  // Communication auth state
  const [commAuthenticated, setCommAuthenticated] = useState(!!localStorage.getItem("userToken"));

  // Payment auth state
  const [payAuthenticated, setPayAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null);

  useEffect(() => {
    const session = localStorage.getItem("userSession");
    const type = localStorage.getItem("userType");
    if (session && type) {
      setPayAuthenticated(true);
      setUserType(type);
    }
  }, []);

  const handlePaymentLogout = () => {
    localStorage.removeItem("userSession");
    localStorage.removeItem("userType");
    setPayAuthenticated(false);
    setUserType(null);
  };

  return (
    <Router>
      {/* Show Sidebar for payment section */}
      {payAuthenticated && <Sidebar onLogout={handlePaymentLogout} />}

      <Routes>
        {/* Communication App Routes */}
        <Route path="/" element={commAuthenticated ? <Navigate to="/app" /> : <Navigate to="/auth" />} />
        {!commAuthenticated && <Route path="/auth" element={<LoginRegisterPage />} />}
        {commAuthenticated && <Route path="/app" element={<WhatsAppLayout />} />}
        <Route path="/subscription" element={<SubscriptionPage />} />
        {/* Payment App Auth & Routing */}
        <Route
          path="/payment-entry"
          element={payAuthenticated ? <Navigate to="/dashboard" /> : <Login setIsAuthenticated={setPayAuthenticated} setUserType={setUserType} />}
        />
        <Route
          path="/payment-register"
          element={<Register setIsAuthenticated={setPayAuthenticated} setUserType={setUserType} />}
        />

        {/* Payment App Protected Routes */}
        {payAuthenticated && (
          <>
            <Route path="/dashboard" element={<Dashboard userType={userType} />} />
            <Route path="/deposit" element={<Deposit />} />
            <Route path="/withdraw" element={<Withdraw />} />
            <Route path="/transfer" element={<TokenTransfer />} />
            <Route path="/receive" element={<Receive />} />
            <Route path="/tx-viewer" element={<TxViewer />} />
            <Route path="/queue" element={<TransferQueue />} />
            
            {userType === "corporate" && (
              <>
                <Route path="/multisig" element={<MultiSig />} />
                <Route path="/escrow" element={<Escrow />} />
              </>
            )}
          </>
        )}

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
