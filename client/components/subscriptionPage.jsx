import React ,{ useEffect, useState } from "react";
import axios from "axios";

export default function SubscriptionPage() {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);l
  const [currency, setCurrency] = useState("USD");
  const [userCountry, setUserCountry] = useState("US");
 const API_URL = process.env.REACT_APP_API_URL ;

  useEffect(() => {
    const fetchPlans = async () => {
      const res = await axios.get(`${API_URL}/api/admin/subscription-plans`);
      setPlans(res.data); 
    };
    fetchPlans();
  }, []);
 useEffect(() => {
    const checkExpiry = async () => {
      const userId = Meteor.userId() || localStorage.getItem("userId") || process.env.REACT_APP_USER_ID;

        if (!userId) return;
        
        const res = await axios.get(`${API_URL}/api/subscription-check/${userId}`);
    
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
    const userId = localStorage.getItem("userId");

   if (provider === "onmeta") {
  window.open(
    `${process.env.REACT_APP_ONMETA_URL}?apiKey=${process.env.REACT_APP_ONMETA_API_KEY}&walletAddress=${process.env.REACT_APP_ADMIN_WALLET}&cryptoCurrency=USDT&fiatAmount=${displayPrice}&network=ethereum`,
    "_blank"
  );
}  else if (provider === "coinbase") {
  window.open(
    `${process.env.REACT_APP_COINBASE_CHECKOUT_URL}?customer_wallet=${process.env.REACT_APP_ADMIN_WALLET}&metadata[userId]=${userId}`,
    "_blank"
  );

  
  return;


}

  };

  return (
  <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white p-8 flex flex-col items-center justify-start font-sans">
    <div className="w-full max-w-xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-8 space-y-8 animate-fade-in">

      <h2 className="text-3xl font-bold text-center mb-4 tracking-wide">💼 Choose a Subscription Plan</h2>

      {/* Plans */}
      {plans.map((plan) => (
        <button
          key={plan.plan_key}
          onClick={() => setSelectedPlan(plan)}
          className={`w-full text-left p-4 rounded-xl transition-all border ${
            selectedPlan?.plan_key === plan.plan_key
              ? "bg-white/10 border-pink-500 ring-2 ring-pink-400"
              : "border-white/10 hover:bg-white/5"
          }`}
        >
          <h3 className="text-xl font-bold">{plan.name}</h3>
          <p className="text-sm text-white/70">📨 Messages: {plan.max_messages}</p>
          <p className="text-sm text-white/70">💸 Transactions: {plan.max_transactions}</p>
          <p className="text-md font-semibold mt-2 text-pink-400">
            {plan.country_prices?.[userCountry]
              ? `${plan.country_prices[userCountry]} ${currency}`
              : `$${plan.price_usd}`}
          </p>
        </button>
      ))}

      {/* Payment Buttons */}
      {selectedPlan && (
        <div className="flex space-x-4 mt-4">
          <button
  onClick={() => handlePayment("coinbase")}
  className="flex-1 py-3 px-4 rounded-xl font-semibold shadow-lg bg-gradient-to-r from-green-400 to-teal-500 hover:scale-[1.02] transition-transform"
>
   Pay with coinbase
</button>
         <button
  onClick={() => handlePayment("onmeta")}
  className="flex-1 py-3 px-4 rounded-xl font-semibold shadow-lg bg-gradient-to-r from-green-400 to-teal-500 hover:scale-[1.02] transition-transform"
>
  🪙 Pay with Onmeta
</button>

        </div>
      )}

    
    </div>
  </div>
);

}
