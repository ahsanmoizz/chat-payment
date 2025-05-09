interface IUserRegistration {
    function getAccountDetails(address user) external view returns (
        string memory name,
        string memory email,
        string memory phoneNumber,
        string memory accountNumber,
        string memory qrCodeData,
        bool exists
    );
}
