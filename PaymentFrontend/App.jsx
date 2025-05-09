import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Dashboard from "./components/Dashboard";
import Register from "./components/Register";
import Deposit from "./components/Deposit";
import Withdraw from "./components/Withdraw";
import TokenTransfer from "./components/TokenTransfer";
import Receive from "./components/Receive";
import MultiSig from "./components/MultiSig";
import Escrow from "./components/Escrow";
import Sidebar from "./components/Sidebar";
import Login from "./components/Login";
import Payment from "./components/Payment";
import { Web3Provider } from "./context/Web3Context";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null); // 'single' or 'corporate'

  useEffect(() => {
    const userSession = localStorage.getItem("userSession");
    const userType = localStorage.getItem("userType");
    if (userSession && userType) {
      setIsAuthenticated(true);
      setUserType(userType);
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setUserType(null);
  };

  return (
    <Web3Provider>
      <Router>
        {isAuthenticated && <Sidebar onLogout={handleLogout} />}
        <Routes>
          <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/register"} />} />
          <Route path="/register" element={<Register setIsAuthenticated={setIsAuthenticated} setUserType={setUserType} />} />
          <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} setUserType={setUserType} />} />
          <Route path="/payment" element={<Payment />} />

          {isAuthenticated && (
            <>
              <Route path="/dashboard" element={<Dashboard userType={userType} />} />
              <Route path="/deposit" element={<Deposit />} />
              <Route path="/withdraw" element={<Withdraw />} />
              <Route path="/transfer" element={<TokenTransfer />} />
              <Route path="/receive" element={<Receive />} />
              {userType === "corporate" && (
                <>
                  <Route path="/multisig" element={<MultiSig />} />
                  <Route path="/escrow" element={<Escrow />} />
                </>
              )}
            </>
          )}

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </Web3Provider>
  );
}

export default App;
