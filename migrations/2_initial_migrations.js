const AdminConfig = artifacts.require("Admin");

module.exports = async function (deployer) {
  await deployer.deploy(AdminConfig);
  console.log("✅ AdminConfig deployed at:", AdminConfig.address);
};
