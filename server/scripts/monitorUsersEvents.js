const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

require("dotenv").config();
const { getSetting } = require("../utils/appSettings");
const ABI = require("../../PaymentFrontend/UserRegisterationABI.json");
const ADMIN_RPC = await getSetting("ADMIN_RPC_URL");

const CONTRACT_ADDRESS = process.env.USER_REGISTRATION_ADDRESS;
const PROVIDER = new ethers.JsonRpcProvider(ADMIN_RPC
); // Replace with your actual RPC URL
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, PROVIDER);

async function fetchAllUsersFromEvents() {
  const events = await contract.queryFilter("AccountCreated", 0, "latest");
  const uniqueAddresses = [...new Set(events.map(e => e.args.user))];
  return uniqueAddresses;
}

// Usage for cron
module.exports = { fetchAllUsersFromEvents };
