// cron/monitorUserEvents.js
const { ethers } = require("ethers");
require("dotenv").config();
const ABI = require("../abi/UserRegistrationABI.json");

const PROVIDER = new ethers.JsonRpcProvider(process.env.ADMIN_RPC_URL);
const CONTRACT_ADDRESS = process.env.USER_REGISTRATION_ADDRESS;
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, PROVIDER);

async function fetchAllUsersFromEvents() {
  const events = await contract.queryFilter("AccountCreated", 0, "latest");
  const uniqueAddresses = [...new Set(events.map((e) => e.args.user))];
  return uniqueAddresses;
}

module.exports = { fetchAllUsersFromEvents };
