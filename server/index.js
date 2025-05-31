const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Routes
const settingsRoutes = require("./routes/settingsRoutes");
const walletRoutes = require("./routes/walletRoutes");
const balanceRoutes = require("./routes/balanceRoutes");
const bridgeRoutes = require("./routes/bridgeWithdrawRoutes");
const webhookRoutes = require("./routes/webHookRoutes");
const delayedTransferRoute = require("./routes/delayed-transfer");
const historyRoute = require("./routes/history");
const evmTxLogger = require("./routes/evmTransactionLogger");
const onmetaRoute = require("./routes/onmeta");
const adminTxRoute = require("./routes/adminHistory");
const subscriptionAdminRoutes = require("./routes/subscriptionAdminRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const subscriptionCheckRoutes = require("./routes/subscriptionCheckRoutes");
const adminNonEvmRoutes = require("./routes/adminNonevmRoutes");
const coinbaseWebhook = require("./routes/coinbase");
app.use("/api/coinbase", coinbaseWebhook);
app.use("/api/deposit-hook", require("./api/deposit-hook"));


// ✅ Listeners (contracts, on-chain events)
require("./listeners/contractSync");

// ✅ Cron job: Deposit scanner
const scanDeposits = require("./Cron/depositScanner");
const cron = require("node-cron");
cron.schedule("*/5 * * * *", async () => {
  console.log("🟢 [Cron] Checking non-EVM deposits...");
  await scanDeposits();
});

// ✅ Mount API routes
app.use("/api/settings", settingsRoutes); // for GET and POST
app.use("/api/wallet", walletRoutes);
app.use("/api/balances", balanceRoutes);
app.use("/api/bridge-withdraw", bridgeRoutes);
app.use("/api/webhook", webhookRoutes);
app.use("/api/delayed-transfer", delayedTransferRoute);
app.use("/api/history", historyRoute);
app.use("/api/evm-tx-log", evmTxLogger);
app.use("/api/onmeta", onmetaRoute);
app.use("/api/admin", adminTxRoute);
app.use("/api/admin/non-evm", adminNonEvmRoutes);
app.use("/api/admin/subscription-plans", subscriptionAdminRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/subscription-check", subscriptionCheckRoutes);

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
