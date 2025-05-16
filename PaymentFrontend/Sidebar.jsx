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
    <div className="bg-gray-800 text-white w-64 min-h-screen p-4">
      <h2 className="text-xl font-bold mb-6">Wallet Menu</h2>
      <ul className="space-y-3">
      {navItems.map((item) => (
  <button
    key={item.path}
    onClick={() => navigate(item.path)}
    className="cursor-pointer hover:bg-gray-700 px-3 py-2 rounded text-left w-full"
  >
    {item.label}
  </button>
))}

      <button
  onClick={handleLogout}
  className="cursor-pointer text-red-400 hover:text-white hover:bg-red-500 px-3 py-2 rounded mt-4 w-full text-left"
>
  Logout
</button>

      </ul>
    </div>
  );
};

export default Sidebar;
