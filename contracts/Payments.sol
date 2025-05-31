// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./IUserRegisteration.sol";

interface IAdminConfig {
    function getAllFees() external view returns (
        uint256 depositFee,
        uint256 withdrawalFee,
        uint256 transactionFee,
        uint256 escrowServiceFee,
        uint256 multisigServiceFee
    );
}

contract MultiAssetWallet is Ownable, ReentrancyGuard, AccessControl, Pausable {
    using Math for uint256;

    // Roles
    bytes32 public constant ESCROW_MANAGER_ROLE = keccak256("ESCROW_MANAGER");
    bytes32 public constant MULTISIG_APPROVER_ROLE = keccak256("MULTISIG_APPROVER");
    uint256 public minDepositAmount = 1e15; // 0.001 ETH

    mapping(address => mapping(address => uint256)) private tokenBalances;
    mapping(address => uint256) public collectedFees;

    // Escrow
    struct Escrow {
        address buyer;
        address seller;
        address tokenAddress;
        uint256 amount;
        uint256 tokenId;
        bool isNFT;
        bool isCompleted;
    }

    mapping(uint256 => Escrow) private escrows;
    uint256 private escrowCounter;

    // Multisig
    struct MultiSigTransaction {
        address initiator;
        address recipient;
        address tokenAddress;
        uint256 amount;
        uint256 tokenId;
        uint256 approvals;
        bool executed;
        bool isNFT;
        mapping(address => bool) approvedBy;
    }

    mapping(uint256 => MultiSigTransaction) private multisigTxs;
    uint256 private multisigTxCounter;
    uint256 public requiredApprovals = 2;

struct ScheduledTransfer {
    address from;
    address to;
    address token;
    uint256 amount;
    uint256 unlockTime;
    bool executed;
    bool canceled;
}

mapping(uint256 => ScheduledTransfer) public scheduledTransfers;
uint256 public nextScheduledId;


    // External contracts
    IUserRegistration public registration;
    IAdminConfig public admin;

    // Events
    event Deposit(address indexed user, address indexed token, uint256 amount);
    event Withdrawal(address indexed user, address indexed token, uint256 amount);
    event Transfer(address indexed from, address indexed to, address indexed token, uint256 amount);
    event EscrowCreated(uint256 indexed escrowId, address indexed buyer, address indexed seller, address token, uint256 amount);
    event EscrowCompleted(uint256 indexed escrowId);
    event MultiSigTransactionCreated(uint256 indexed txId, address indexed initiator, address indexed recipient, address token, uint256 amount);
    event MultiSigTransactionApproved(uint256 indexed txId, address indexed approver);
    event MultiSigTransactionExecuted(uint256 indexed txId);
    event FeesWithdrawn(address indexed admin, address indexed token, uint256 amount);

    constructor(address _adminConfig, address _registrationAddress) Ownable(msg.sender) {
        require(_adminConfig != address(0), "AdminConfig required");
        require(_registrationAddress != address(0), "Registration required");
        admin = IAdminConfig(_adminConfig);
        registration = IUserRegistration(_registrationAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier onlyRegisteredUser() {
        (, , , , , bool exists) = registration.getAccountDetails(msg.sender);
        require(exists, "User not registered");
        _;
    }


function setRegistrationContract(address _registration) external onlyOwner {
    require(_registration != address(0), "Invalid address");
    registration = IUserRegistration(_registration);
}

     
   function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
    _pause();
}

function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
    _unpause();
}
    // ========== Balance View ==========
    function getBalance(address token, address user) external view returns (uint256) {
        return tokenBalances[token][user];
    }

    // ========== Deposit ==========

    function depositETH() external payable onlyRegisteredUser whenNotPaused {
        require(msg.value >= minDepositAmount, "Deposit too small");
        (uint256 depositFee, , , , ) = admin.getAllFees();
        uint256 fee = msg.value * depositFee / 10000;
        uint256 finalAmount = msg.value - fee;

        tokenBalances[address(0)][msg.sender] += finalAmount;
        collectedFees[address(0)] += fee;

        emit Deposit(msg.sender, address(0), finalAmount);
    }

    function depositERC20(address token, uint256 amount) external onlyRegisteredUser  whenNotPaused nonReentrant {
        require(amount >= minDepositAmount, "Deposit too small");

        (uint256 depositFee, , , , ) = admin.getAllFees();
        uint256 fee = amount * depositFee / 10000;
        uint256 finalAmount = amount - fee;

        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");

        tokenBalances[token][msg.sender] += finalAmount;
        collectedFees[token] += fee;

        emit Deposit(msg.sender, token, finalAmount);
    }

    // ========== Withdraw ==========

    function withdrawETH(uint256 amount) external onlyRegisteredUser nonReentrant whenNotPaused {
        require(tokenBalances[address(0)][msg.sender] >= amount, "Insufficient balance");

        (, uint256 withdrawalFee, , , ) = admin.getAllFees();
        uint256 fee = amount * withdrawalFee / 10000;
        uint256 finalAmount = amount - fee;

        tokenBalances[address(0)][msg.sender] -= amount;
        collectedFees[address(0)] += fee;

        payable(msg.sender).transfer(finalAmount);
        emit Withdrawal(msg.sender, address(0), finalAmount);
    }

    function withdrawERC20(address token, uint256 amount) external onlyRegisteredUser nonReentrant whenNotPaused {
        require(tokenBalances[token][msg.sender] >= amount, "Insufficient balance");

        (, uint256 withdrawalFee, , , ) = admin.getAllFees();
        uint256 fee = amount * withdrawalFee / 10000;
        uint256 finalAmount = amount - fee;

        tokenBalances[token][msg.sender] -= amount;
        collectedFees[token] += fee;

        require(IERC20(token).transfer(msg.sender, finalAmount), "Transfer failed");
        emit Withdrawal(msg.sender, token, finalAmount);
    }

    // ========== Transfer ==========

    function transferETH(address recipient, uint256 amount) external onlyRegisteredUser nonReentrant whenNotPaused {
        require(tokenBalances[address(0)][msg.sender] >= amount, "Insufficient balance");

        (, , uint256 transactionFee, , ) = admin.getAllFees();
        uint256 fee = amount * transactionFee / 10000;
        uint256 finalAmount = amount - fee;

        tokenBalances[address(0)][msg.sender] -= amount;
        tokenBalances[address(0)][recipient] += finalAmount;
        collectedFees[address(0)] += fee;

        emit Transfer(msg.sender, recipient, address(0), finalAmount);
    }

    function transferERC20(address token, address recipient, uint256 amount) external onlyRegisteredUser nonReentrant whenNotPaused {
        require(tokenBalances[token][msg.sender] >= amount, "Insufficient balance");

        (, , uint256 transactionFee, , ) = admin.getAllFees();
        uint256 fee = amount * transactionFee / 10000;
        uint256 finalAmount = amount - fee;

        tokenBalances[token][msg.sender] -= amount;
        tokenBalances[token][recipient] += finalAmount;
        collectedFees[token] += fee;

        emit Transfer(msg.sender, recipient, token, finalAmount);
    }

    // ========== Escrow ==========

    function createEscrow(
        address seller,
        address token,
        uint256 amount,
        uint256 tokenId,
        bool isNFT
    ) external payable nonReentrant onlyRegisteredUser whenNotPaused {
        require(token != address(0) || msg.value > 0 || amount > 0, "Invalid escrow");

        if (!isNFT) {
            if (token == address(0)) {
                require(msg.value == amount, "ETH mismatch");
            } else {
                require(tokenBalances[token][msg.sender] >= amount, "Insufficient balance");
                tokenBalances[token][msg.sender] -= amount;
            }
        } else {
            require(IERC721(token).ownerOf(tokenId) == msg.sender, "Not NFT owner");
            IERC721(token).transferFrom(msg.sender, address(this), tokenId);
        }

        escrows[escrowCounter] = Escrow(msg.sender, seller, token, amount, tokenId, isNFT, false);
        emit EscrowCreated(escrowCounter, msg.sender, seller, token, amount);
        escrowCounter++;
    }

    function completeEscrow(uint256 escrowId) external onlyRole(ESCROW_MANAGER_ROLE) nonReentrant whenNotPaused {
        Escrow storage esc = escrows[escrowId];
        require(!esc.isCompleted, "Escrow already completed");

        (,,, uint256 escrowFee, ) = admin.getAllFees();
        uint256 fee = esc.amount * escrowFee / 10000;
        uint256 amountToSeller = esc.amount - fee;

        if (!esc.isNFT) {
            if (esc.tokenAddress == address(0)) {
                payable(esc.seller).transfer(amountToSeller);
                collectedFees[address(0)] += fee;
            } else {
                tokenBalances[esc.tokenAddress][esc.seller] += amountToSeller;
                collectedFees[esc.tokenAddress] += fee;
            }
        } else {
            IERC721(esc.tokenAddress).transferFrom(address(this), esc.seller, esc.tokenId);
        }

        esc.isCompleted = true;
        emit EscrowCompleted(escrowId);
    }

    // ========== Multisig ==========

    function createMultiSigTransaction(
        address recipient,
        address token,
        uint256 amount,
        uint256 tokenId,
        bool isNFT
    ) external payable onlyRole(MULTISIG_APPROVER_ROLE) nonReentrant whenNotPaused {
        if (!isNFT && token == address(0)) {
            require(msg.value == amount, "ETH mismatch");
        }

        MultiSigTransaction storage txData = multisigTxs[multisigTxCounter];
        txData.initiator = msg.sender;
        txData.recipient = recipient;
        txData.tokenAddress = token;
        txData.amount = amount;
        txData.tokenId = tokenId;
        txData.approvals = 0;
        txData.executed = false;
        txData.isNFT = isNFT;

        emit MultiSigTransactionCreated(multisigTxCounter, msg.sender, recipient, token, amount);
        multisigTxCounter++;
    }

    function approveMultiSigTransaction(uint256 txId) external onlyRole(MULTISIG_APPROVER_ROLE) nonReentrant whenNotPaused {
        MultiSigTransaction storage txData = multisigTxs[txId];
        require(!txData.executed, "Already executed");
        require(!txData.approvedBy[msg.sender], "Already approved");

        txData.approvedBy[msg.sender] = true;
        txData.approvals++;

        emit MultiSigTransactionApproved(txId, msg.sender);

        if (txData.approvals >= requiredApprovals) {
            executeMultiSigTransaction(txId);
        }
    }

    function executeMultiSigTransaction(uint256 txId) internal nonReentrant whenNotPaused {
        MultiSigTransaction storage txData = multisigTxs[txId];
        require(!txData.executed, "Already done");
        require(txData.approvals >= requiredApprovals, "Insufficient approvals");

        (,,,, uint256 multisigFee) = admin.getAllFees();
        uint256 fee = txData.amount * multisigFee / 10000;
        uint256 finalAmount = txData.amount - fee;

        if (!txData.isNFT) {
            if (txData.tokenAddress == address(0)) {
                payable(txData.recipient).transfer(finalAmount);
                collectedFees[address(0)] += fee;
            } else {
                tokenBalances[txData.tokenAddress][txData.recipient] += finalAmount;
                collectedFees[txData.tokenAddress] += fee;
            }
        } else {
            IERC721(txData.tokenAddress).transferFrom(address(this), txData.recipient, txData.tokenId);
        }

        txData.executed = true;
        emit MultiSigTransactionExecuted(txId);
    }

    // ========== Admin Fee Withdrawal ==========

    function getCollectedFee(address token) external view returns (uint256) {
        return collectedFees[token];
    }

    function withdrawCollectedFees(address token) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant whenNotPaused {
        uint256 feeAmount = collectedFees[token];
        require(feeAmount > 0, "No fees to withdraw");
        collectedFees[token] = 0;

        if (token == address(0)) {
            payable(msg.sender).transfer(feeAmount);
        } else {
            require(IERC20(token).transfer(msg.sender, feeAmount), "Transfer failed");
        }

        emit FeesWithdrawn(msg.sender, token, feeAmount);
    }


function scheduleTransfer(
    address to,
    address token,
    uint256 amount,
    uint256 delayInSeconds
) external onlyRegisteredUser whenNotPaused {
    require(tokenBalances[token][msg.sender] >= amount, "Insufficient balance");

    tokenBalances[token][msg.sender] -= amount;

    scheduledTransfers[nextScheduledId] = ScheduledTransfer({
        from: msg.sender,
        to: to,
        token: token,
        amount: amount,
        unlockTime: block.timestamp + delayInSeconds,
        executed: false,
        canceled: false
    });

    nextScheduledId++;
}

function executeScheduledTransfer(uint256 id) external nonReentrant whenNotPaused {
    ScheduledTransfer storage txData = scheduledTransfers[id];
    require(!txData.executed, "Already executed");
    require(!txData.canceled, "Canceled");
    require(block.timestamp >= txData.unlockTime, "Too early");

    tokenBalances[txData.token][txData.to] += txData.amount;
    txData.executed = true;

    emit Transfer(txData.from, txData.to, txData.token, txData.amount);
}
  function cancelScheduledTransfer(uint256 id) external whenNotPaused {
    ScheduledTransfer storage txData = scheduledTransfers[id];
    require(msg.sender == txData.from, "Not sender");
    require(!txData.executed, "Already executed");
    require(!txData.canceled, "Already canceled");

    txData.canceled = true;
    tokenBalances[txData.token][txData.from] += txData.amount;
}

}
