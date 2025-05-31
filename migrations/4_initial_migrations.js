const UserRegistration = artifacts.require("UserRegistration");
const MultiAssetWallet = artifacts.require("MultiAssetWallet");

module.exports = async function (deployer) {
  const walletInstance = await MultiAssetWallet.deployed();

  // Deploy UserRegistration and link it to wallet
  await deployer.deploy(UserRegistration, walletInstance.address);
  const registration = await UserRegistration.deployed();

  // Link UserRegistration to MultiAssetWallet
  await walletInstance.setRegistrationContract(registration.address);

  console.log("✅ UserRegistration deployed at:", registration.address);
  console.log("🔗 Registration linked to MultiAssetWallet");
};
