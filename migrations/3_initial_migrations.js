const MultiAssetWallet = artifacts.require("Payments");
const AdminConfig = artifacts.require("Admin");

module.exports = async function (deployer) {
  const adminConfig = await AdminConfig.deployed();

  // Deploy with dummy address for registration (it will be set later)
  const dummyRegistrationAddress = "0x0000000000000000000000000000000000000000";

  await deployer.deploy(MultiAssetWallet, adminConfig.address, dummyRegistrationAddress);

  console.log("✅ MultiAssetWallet deployed at:", MultiAssetWallet.address);
};
