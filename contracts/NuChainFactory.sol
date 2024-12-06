// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import "./Liquiditypool.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

contract NuChainFactory is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable
{

    bytes32 public constant PAUSER_ROLE =
        keccak256(abi.encodePacked("PAUSER_ROLE"));

    uint256 public tradingFee; /// Trading Fee (1% = 100)
    uint256 public rewardRate; /// Reward Rate (1e18)
    uint256 public rewardPeriod; /// Reward Period 

    /// stablecoin address => liquidity pool address
    mapping(address stablecoin => address) public poolInfo;

    /// Array of stablecoins addresses for which liquidity pools are created
    address[] private stablecoins;
    /// Array of liquidity pools created
    address[] private liquidityPools;

    event PoolCreated(address indexed stablecoin,address indexed liquidityPool);

    /* 
        @notice function to initialize the contract factory contract
        @param _defaultAdmin address of the default admin
        @param _rewardRate Reward rate
        @param _tradingFee Tradinf fee
        @param _rewardDays Reward cooldown period
    */
    function initialize(
        address _defaultAdmin,
        uint _rewardRate,
        uint _tradingFee,
        uint _rewardDays
    ) public initializer {

        require(_tradingFee <= 1000, "Trading Fee too high");
        require(_rewardRate != 0 && _rewardDays!= 0, "Reward Rate and Trading Fee can't be zero");

        __Pausable_init();
        __AccessControl_init();

        rewardRate = _rewardRate;
        tradingFee = _tradingFee;
        rewardPeriod = _rewardDays * 1 days;
        _grantRole(DEFAULT_ADMIN_ROLE, _defaultAdmin);
    }

    /*
        @notice function to create the pool
        @param _defaultAdmin address of the default admin of liquidity pool
        @param _USDN contract address of the USDN
        @param _stablecoin contract address of the stable coin
        only Default Admin can call this function
    */
    function createPool(
        address _defaultAdmin,
        address _USDN,
        address _stablecoin
    ) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE) {
       
        require(poolInfo[_stablecoin] == address(0) , "Pool already exists");
        address newPool = address(new Liquiditypool());
        Liquiditypool(newPool).initialize(_defaultAdmin,_USDN,_stablecoin,address(this));
        poolInfo[_stablecoin] = newPool;

        stablecoins.push(_stablecoin);
        liquidityPools.push(newPool);

        emit PoolCreated(_stablecoin,newPool);
        
    }

    /*
        @notice function to update the trading fee
        @param _newFee new trading fee
    */
    function updateTradingFee(uint _newFee) external onlyRole(DEFAULT_ADMIN_ROLE){
        require(_newFee <= 1000, "Fee too high"); // Max 10%
        tradingFee = _newFee;
        
    }

    /*
        @notice function to update the reward rate
        @param _newRate New reward rate 
    */
    function updateRewardRate(uint256 _newRate) external onlyRole(DEFAULT_ADMIN_ROLE){

        require(_newRate != 0, "Reward Rate cannot be equal to zero");
        rewardRate = _newRate;
        
    }
    
    /*
        @notice funtion to update the reward period
        @param _days number of days after which user can claim reward
    */
    function updateRewardPeriod(uint _days) external onlyRole(DEFAULT_ADMIN_ROLE){
        require(_days != 0, "Reward Period can not be equal to zero");
        rewardPeriod = _days * 1 days;
        
    }

    /*
        @notice function to pause the smart contract
    */
    function pause() public {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()) ||
                hasRole(PAUSER_ROLE, _msgSender()),
            "Not Authorize to call this function"
        );
        _pause();
    }

    /*
        @notice function to unpause the smart contract
    */
    function unpause() public {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()) ||
                hasRole(PAUSER_ROLE, _msgSender()),
            "Not Authorize to call this function"
        );
        _unpause();
    }

    /*
        @notice function to normalize the decimals of paired stablecoin
    */
    function normalize(uint256 amount, uint256 decimals)
        external
        pure
        returns (uint256)
    {
        return (amount * 1e18) / (10**decimals);
    }

    /*
        @notice function to denormalize the decimals of paired stablecoin
    */
    function denormalize(uint256 amount, uint256 decimals)
        external
        pure
        returns (uint256)
    {
        return (amount * 10**decimals) / (1e18);
    }

    /*
        @returns all deployed liquidity pool addresses
    */
    function allPoolAddresses() external view returns(address[] memory){
        return liquidityPools;
    } 

    function allStablecoinAddresses() external view returns(address[] memory) {
        return stablecoins;
    }
}