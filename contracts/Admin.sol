// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AdminConfig is AccessControl, Ownable{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");

    uint256 public depositFee;
    uint256 public withdrawalFee;
    uint256 public transactionFee;
    uint256 public escrowServiceFee;
    uint256 public multisigServiceFee;

    event FeeUpdated(string feeType, uint256 newFee);
    event AdminAdded(address indexed newAdmin);
    event AdminRemoved(address indexed removedAdmin);

   constructor() Ownable(msg.sender) {
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(ADMIN_ROLE, msg.sender);
}


    // Admin management
    function addAdmin(address newAdmin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ADMIN_ROLE, newAdmin);
        emit AdminAdded(newAdmin);
    }

    function removeAdmin(address adminToRemove) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(ADMIN_ROLE, adminToRemove);
        emit AdminRemoved(adminToRemove);
    }
   

    function setDepositFee(uint256 _fee) external onlyRole(ADMIN_ROLE)  {
        require(_fee <= 500, "Too high");
        depositFee = _fee;
        emit FeeUpdated("Deposit Fee", _fee);
    }

    function setWithdrawalFee(uint256 _fee) external onlyRole(ADMIN_ROLE) {
        require(_fee <= 500, "Too high");
        withdrawalFee = _fee;
        emit FeeUpdated("Withdrawal Fee", _fee);
    }

    function setTransactionFee(uint256 _fee) external onlyRole(ADMIN_ROLE) {
        require(_fee <= 500, "Too high");
        transactionFee = _fee;
        emit FeeUpdated("Transaction Fee", _fee);
    }

    function setEscrowServiceFee(uint256 _fee) external onlyRole(ADMIN_ROLE) {
        require(_fee <= 1000, "Too high");
        escrowServiceFee = _fee;
        emit FeeUpdated("Escrow Service Fee", _fee);
    }

    function setMultisigServiceFee(uint256 _fee) external onlyRole(ADMIN_ROLE) {
        require(_fee <= 1000, "Too high");
        multisigServiceFee = _fee;
        emit FeeUpdated("Multisig Service Fee", _fee);
    }

    function getAllFees() external view returns (
        uint256, uint256, uint256, uint256, uint256
    ) {
        return (
            depositFee,
            withdrawalFee,
            transactionFee,
            escrowServiceFee,
            multisigServiceFee
        );
    }
}
