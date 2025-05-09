// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface IMultiAssetWallet {
    function createWallet(address user) external;
    function getBalance(address user, address token) external view returns (uint256);
}

contract UserRegistration is Ownable {
    using Strings for uint256;

    struct User {
        string name;
        string email;
        string phoneNumber;
        string accountNumber;
        string qrCodeData;
        string username;
        bytes32 passphraseHash;
        bool exists;
    }

    mapping(address => User) private users;
    mapping(string => address) private emailToAddress;
    mapping(string => address) private accountNumberToAddress;
    mapping(string => address) private usernameToAddress;
    mapping(address => string) private addressToUsername;
    mapping(address => bytes32) public faceHash;

    IMultiAssetWallet public walletContract;

    event AccountCreated(
        address indexed user,
        string name,
        string email,
        string phoneNumber,
        string accountNumber,
        string qrCode
    );
    event UserLoggedIn(address indexed user);

    constructor(address _walletContract) Ownable(msg.sender) {
        require(_walletContract != address(0), "Invalid wallet contract address");
        walletContract = IMultiAssetWallet(_walletContract);
    }

    // 🔐 Register salted face hash (using msg.sender)
    function setFaceHash(bytes32 hash) external {
        require(users[msg.sender].exists, "Not registered");
        faceHash[msg.sender] = hash;
    }

    // 🔐 Match salted face hash
    function verifyFace(bytes32 hash) external view returns (bool) {
        return faceHash[msg.sender] == hash;
    }

    function generateAccountNumber(string memory countryCode) private view returns (string memory) {
        return string(abi.encodePacked(countryCode, uint256(uint160(msg.sender)).toString()));
    }

    function getUserWallet(address user) external pure returns (address) {
        return user;
    }

    function getUsername(address user) external view returns (string memory) {
        return addressToUsername[user];
    }

    function getAddressByUsername(string memory username) external view returns (address) {
        return usernameToAddress[username];
    }

    // ✅ FIXED: Username uniqueness check added
    function createAccount(
        string memory name,
        string memory email,
        string memory username,
        string memory phoneNumber,
        string memory countryCode,
        string memory passphrase
    ) external {
        require(!users[msg.sender].exists, "Account already exists");
        require(emailToAddress[email] == address(0), "Email already registered");
        require(usernameToAddress[username] == address(0), "Username already taken"); // ✅ New check

        string memory accountNumber = generateAccountNumber(countryCode);
        bytes32 qrHash = keccak256(abi.encodePacked(msg.sender, email, accountNumber));
string memory qrCodeData = Strings.toHexString(uint256(qrHash));

        
        // 🔒 Current server-side hashing remains — recommend moving to client-side later
        bytes32 passphraseHash = keccak256(abi.encodePacked(passphrase));

        users[msg.sender] = User(name, email, phoneNumber, accountNumber, qrCodeData, username, passphraseHash, true);
        emailToAddress[email] = msg.sender;
        accountNumberToAddress[accountNumber] = msg.sender;
        usernameToAddress[username] = msg.sender;
        addressToUsername[msg.sender] = username;

        walletContract.createWallet(msg.sender);

        emit AccountCreated(msg.sender, name, email, phoneNumber, accountNumber, qrCodeData);
    }

    function loginWithPassphrase(string memory passphrase) external returns (bool) {
        require(users[msg.sender].exists, "Account does not exist");
        require(keccak256(abi.encodePacked(passphrase)) == users[msg.sender].passphraseHash, "Invalid passphrase");

        emit UserLoggedIn(msg.sender);
        return true;
    }

    function loginWithAccountNumber(string memory accountNumber) external view returns (bool) {
        address user = accountNumberToAddress[accountNumber];
        return user == msg.sender;
    }

    function getAccountDetails(address user) external view returns (User memory) {
        require(users[user].exists, "Account does not exist");
        return users[user];
    }

     function verifyQRCodeHash(address user, string memory email, string memory accountNumber, string memory providedHash) external view returns (bool) {
    require(users[user].exists, "User not found");
    bytes32 expectedHash = keccak256(abi.encodePacked(user, email, accountNumber));
    return keccak256(abi.encodePacked(providedHash)) == keccak256(abi.encodePacked(Strings.toHexString(uint256(expectedHash))));
}


    function getAddressByAccountNumber(string memory accountNumber) external view returns (address) {
        address user = accountNumberToAddress[accountNumber];
        require(user != address(0), "Account number not found");
        return user;
    }
}
