// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract ReserveAuditor is Initializable, AccessControlUpgradeable{

    bytes32 public constant MANAGER_ROLE = (keccak256(abi.encodePacked("MANAGER_ROLE")));
    address public stablecoin;

    // Struct to store reserve data
    struct ReserveRecord {
        uint256 timestamp; // Timestamp of the record
        uint256 reserveAmount; // Recorded reserve amount
    }

    // reserve records by an associated stablecoin address
    ReserveRecord[] public reserveRecords;

    // Events
    
    event ReserveRecorded(address indexed stablecoin, uint256 reserveAmount, uint256 timestamp);

    /// @custom:oz-upgrades-unsafe-allow constructor
    // constructor() {
    //     _disableInitializers();
    // }

    function initialize(address defaultAdmin) initializer public {
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
    }

    /**
     * @notice Record reserves for a stablecoin.
     * @param reserveAmount Current reserve amount to be recorded.
     */
    function recordReserve(uint256 reserveAmount) external{
        require(
                hasRole(MANAGER_ROLE, _msgSender()) ||
                hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
                "Not Authorize to call this function"
        );
        require(reserveAmount > 0, "Reserve amount must be greater than zero");
        require(stablecoin != address(0),"Set the stable coin address first");

        reserveRecords.push(ReserveRecord(block.timestamp, reserveAmount));
        emit ReserveRecorded(stablecoin, reserveAmount, block.timestamp);
    }

    function setStableCoinAddress(address _stablecoin) public{
        require(
                hasRole(MANAGER_ROLE, _msgSender()) ||
                hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
                "Not Authorize to call this function"
        );
        require(_stablecoin != address(0), "Invalid stablecoin address");
        stablecoin = _stablecoin;
    }
    /**
     * @notice Verify if the reserves are sufficient to cover the required amount.
     * @param requiredReserve The minimum required reserve amount.
     * @return isSufficient True if reserves are sufficient, false otherwise.
     */
    function verifyReserves(uint256 requiredReserve) external view returns (bool isSufficient) {
        require(requiredReserve > 0, "Required reserve must be greater than zero");

        // Get the latest reserve record for the stablecoin

        require(reserveRecords.length > 0, "No reserve records found");

        uint latestRecord = reserveRecords.length - 1;

        // Check if the actual reserve is sufficient
        isSufficient = reserveRecords[latestRecord].reserveAmount >= requiredReserve;

        // Emit the event after performing the check
        // emit ReserveVerified(stablecoin, requiredReserve, reserveRecords[latestRecord].reserveAmount, isSufficient);

        return isSufficient;
    }


    /**
     * @notice Get the latest reserve record for a stablecoin.
     * @return latestReserve The latest reserve record.
     */
    function getLatestReserve() external view returns (ReserveRecord memory latestReserve) {

        return reserveRecords[reserveRecords.length - 1];
    }

    /**
     * @notice Get all reserve records for a stablecoin.
     * @return records Array of all reserve records.
     */
    function getAllReserves( ) external view returns (ReserveRecord[] memory ) {
        
        return reserveRecords;
    }
}
