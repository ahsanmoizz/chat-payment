import { useEffect, useState } from "react";
import axios from "axios";

export default function SubscriptionPage() {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false); // ✅ Define this at top level
  const [currency, setCurrency] = useState("USD");
  const [userCountry, setUserCountry] = useState("US");


  useEffect(() => {
    const fetchPlans = async () => {
      const res = await axios.get("http://localhost:5000/api/admin/subscription-plans");
      setPlans(res.data);
    };
    fetchPlans();
  }, []);
  useEffect(() => {
    const checkExpiry = async () => {
      const userId = localStorage.getItem("wallet");
      const res = await axios.get(`/api/subscription-check/${userId}`);
  
      if (res.data.expired) {
        alert("Your subscription expired. Please renew to continue using features.");
      }
    };
  
    checkExpiry();
  }, []);
  useEffect(() => {
    const fetchGeo = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        setUserCountry(data.country || "US");
        setCurrency(data.currency || "USD");

      } catch (err) {
        console.warn("Could not fetch IP data", err);
      }
    };
    fetchGeo();
  }, []);
  
  
  
  const handlePayment = async (provider) => {
    if (!selectedPlan) return alert("Select a plan");
    const displayPrice = selectedPlan.country_prices?.[userCountry] || selectedPlan.price_usd;
    const userId = localStorage.getItem("user_id");

    // 🌐 Open provider popup
    if (provider === "moonpay") {
      window.open(
        `https://buy.moonpay.com?apiKey=your_moonpay_api_key&currencyCode=usdt&walletAddress=${userId}&baseCurrencyAmount=${displayPrice}`,
        "_blank"
      );
    } else if (provider === "transak") {
      window.open(
        `https://global.transak.com?apiKey=your_transak_api_key&cryptoCurrency=USDT&network=ethereum&defaultCryptoAmount=${displayPrice}&disableWalletAddressForm=true&walletAddress=${userId}`,
        "_blank"
      );
      setShowConfirm(true); // ✅ Show manual confirm
      return; // 🧠 Skip auto-confirm for Transak
    }

    // ✅ Auto-confirm only for MoonPay (if desired)
    try {
      await axios.post("http://localhost:5000/api/subscription/confirm", {
        userId,
        planKey: selectedPlan.plan_key,
        amount: displayPrice,
        provider,
        country: userCountry,
        currencyUsed: currency
      });

      alert("✅ Subscription confirmed!");
    } catch (err) {
      console.error("Subscription confirmation failed:", err);
      alert("❌ Could not confirm subscription. Please contact support.");
    }
  };

  // ✅ Manual confirmation handler (after Transak payment)
  const handleConfirm = async () => {
    const userId = localStorage.getItem("user_id");
    const displayPrice = selectedPlan?.country_prices?.[userCountry] || selectedPlan?.price_usd;

    try {
      await axios.post("http://localhost:5000/api/subscription/confirm", {
        userId,
        planKey: selectedPlan.plan_key,
        amount: displayPrice,
        provider: "manual",
        country: userCountry,
        currencyUsed: currency
      });

      alert("✅ Subscription confirmed!");
      setShowConfirm(false);
    } catch (err) {
      console.error("Confirmation error:", err);
      alert("❌ Could not confirm. Contact support.");
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Choose a Subscription Plan</h2>

      {plans.map((plan) => (
        <div
          key={plan.plan_key}
          className={`border p-4 rounded mb-4 cursor-pointer ${
            selectedPlan?.plan_key === plan.plan_key ? "border-blue-500 bg-blue-50" : ""
          }`}
          onClick={() => setSelectedPlan(plan)}
        >
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <p className="text-sm text-gray-600">Messages: {plan.max_messages}</p>
          <p className="text-sm text-gray-600">Transactions: {plan.max_transactions}</p>
          <p className="text-sm mt-1 font-medium">
  {plan.country_prices?.[userCountry]
    ? `${plan.country_prices[userCountry]} ${currency}`
    : `$${plan.price_usd}`}
</p>


        </div>
      ))}

      {selectedPlan && (
        <div className="flex space-x-4 mt-4">
          <button
            className="bg-indigo-600 text-white px-4 py-2 rounded"
            onClick={() => handlePayment("transak")}
          >
            Pay with Transak
          </button>

          <button
            className="bg-green-600 text-white px-4 py-2 rounded"
            onClick={() => handlePayment("moonpay")}
          >
            Pay with MoonPay
          </button>
        </div>
      )}

      {/* ✅ Manual confirmation button for Transak */}
      {showConfirm && (
        <div className="mt-4">
          <button
            onClick={handleConfirm}
            className="bg-purple-600 text-white px-4 py-2 rounded"
          >
            ✅ Confirm Payment Done
          </button>
        </div>
      )}
    </div>
  );
}
