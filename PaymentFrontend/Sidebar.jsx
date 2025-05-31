import { useNavigate } from "react-router-dom";

const Sidebar = () => {
  const navigate = useNavigate();
  const userType = localStorage.getItem("userType") || "single";

  const navItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Deposit", path: "/receive" },
    { label: "Withdraw", path: "/withdraw" },
    { label: "Transfer", path: "/transfer" },
    {label:"TransactionViewer", path:"/txviewer"},
    {label:"TransactionQueue", path:"/transferqueue"},
    ...(userType === "corporate"
      ? [
          { label: "Multisig", path: "/multisig" },
          { label: "Escrow", path: "/escrow" },
        ]
      : []),
  ];

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };
return (
  <div className="bg-white/5 backdrop-blur-xl text-white w-64 min-h-screen p-6 border-r border-white/10 shadow-xl relative animate-fade-in">
    {/* Glowing SVG decoration */}
    <svg className="absolute -top-6 -left-6 w-24 h-24 text-indigo-500/20 animate-pulse" fill="none" viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="80" fill="currentColor" />
    </svg>

    <h2 className="text-2xl font-extrabold mb-8 tracking-wide text-white/90">⚙️ Wallet Menu</h2>

    <ul className="space-y-3">
      {navItems.map((item) => (
        <button
          key={item.path}
          onClick={() => navigate(item.path)}
          className="w-full text-left px-4 py-2 rounded-lg bg-white/5 hover:bg-gradient-to-r from-indigo-500 to-purple-500 hover:text-white transition-all shadow-sm hover:shadow-md"
        >
          {item.label}
        </button>
      ))}

      <button
        onClick={handleLogout}
        className="mt-6 w-full text-left px-4 py-2 rounded-lg text-red-300 hover:text-white hover:bg-red-600 transition-all shadow-sm"
      >
        🚪 Logout
      </button>
    </ul>
  </div>
);

};

export default Sidebar;
