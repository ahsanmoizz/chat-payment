const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

const ABI = require("../../PaymentFrontend/UserRegisterationABI.json");
const CONTRACT_ADDRESS = process.env.USER_REGISTRATION_ADDRESS||"0xDUMMY_USER_REGISTRATION_ADDRESS_1234567890abcdef";
const PROVIDER = new ethers.JsonRpcProvider(process.env.ADMIN_RPC_URL||"https://dummy-admin-rpc.yourdomain.com");
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, PROVIDER);

async function fetchAllUsersFromEvents() {
  const events = await contract.queryFilter("AccountCreated", 0, "latest");
  const uniqueAddresses = [...new Set(events.map(e => e.args.user))];
  return uniqueAddresses;
}

// Usage for cron
module.exports = { fetchAllUsersFromEvents };
