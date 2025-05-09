const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./routes/history");
require("./routes/delayed-transfer");
const app = express();
app.use(cors());
app.use(express.json());

// Current registered routes
const walletRoutes = require("./routes/walletRoutes");
const balanceRoutes = require("./routes/balanceRoutes");
const bridgeRoutes = require("./routes/bridgeWithdrawRoutes");
const webhookRoutes = require("./routes/webHookRoutes");
const scanDeposits = require("./Cron/depositScanner");
const cron = require("node-cron")

// ✅ Add this 👇 for Subscription Admin Panel
const subscriptionAdminRoutes = require("./routes/subscriptionAdminRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const subscriptionCheckRoutes = require("./routes/subscriptionCheckRoutes");
const adminNonEvmRoutes = require("./routes/adminNonevmRoutes");
const moonpayWebhook = require("./routes/moonpay");
const adminTxRoute = require("./routes/adminHistory");
const evmTxLogger = require("./routes/evmTransactionLogger");
 

 app.use("/api/delayed-transfer"),
app.use("/api/admin", adminTxRoute);
// Mount API routes
app.use("/api/history"), 

app.use("/api/evm-tx-log", evmTxLogger);
// Mount API routes
app.use("/api/webhook", moonpayWebhook);
app.use("/api/wallet", walletRoutes);
app.use("/api/balances", balanceRoutes);
app.use("/api/bridge-withdraw", bridgeRoutes);
app.use("/api/admin/non-evm", adminNonEvmRoutes);
app.use("/api", webhookRoutes);
// ✅ New mounts
app.use("/api/admin/subscription-plans", subscriptionAdminRoutes); // Admin updates/creates plans
app.use("/api/subscription", subscriptionRoutes); // Confirm user payment
app.use("/api/subscription-check", subscriptionCheckRoutes); // Expiry checker

cron.schedule("*/5 * * * *", async () => {
    console.log("🟢 [Cron] Checking non-EVM deposits...");
    await scanDeposits();
  });
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
