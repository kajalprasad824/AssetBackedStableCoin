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

    uint tradingFee;
    uint256 rewardRate;
    uint256 rewardPeriod;

    struct PoolInfo{
        address _contractAddress;
        bool isExists;
    }
    mapping(address stablecoin => PoolInfo) public poolInfo;

    address[] private stablecoins;
    address[] private liquidityPools;

    event PoolCreated(address indexed stablecoin, address indexed pool);

    function initialize(
        address _defaultAdmin,
        uint _rewardRate,
        uint _tradingFee,
        uint _rewardDays
    ) public initializer {
        __Pausable_init();
        __AccessControl_init();

        rewardRate = _rewardRate;
        tradingFee = _tradingFee;
        rewardPeriod = _rewardDays * 1 days;
        _grantRole(DEFAULT_ADMIN_ROLE, _defaultAdmin);
    }

    function createPool(
        address _defaultAdmin,
        address _USDN,
        address _stablecoin
    ) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE) {
        PoolInfo storage pool = poolInfo[_stablecoin];
        require(!pool.isExists , "Pool already exists");
        address newPool = address(new Liquiditypool());
        Liquiditypool(newPool).initialize(_defaultAdmin,_USDN,_stablecoin,address(this));
        pool._contractAddress = newPool;
        pool.isExists = true;

        stablecoins.push(_stablecoin);
        liquidityPools.push(newPool);

        emit PoolCreated(_stablecoin,newPool);
        
    }

    function updateTradingFee(uint _newFee) external onlyRole(DEFAULT_ADMIN_ROLE){
        require(_newFee <= 1000, "Fee too high"); // Max 10%
        tradingFee = _newFee;
    }

    function updateRewardRate(uint256 _newRate) external onlyRole(DEFAULT_ADMIN_ROLE){

        require(_newRate != 0, "Reward Rate cannot be equal to zero");
        rewardRate = _newRate;
    }

    function updateRewardPeriod(uint _days) external onlyRole(DEFAULT_ADMIN_ROLE){
        require(_days != 0, "Reward Period can not be equal to zero");
        rewardPeriod = _days * 1 days;
    }

    function pause() public {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()) ||
                hasRole(PAUSER_ROLE, _msgSender()),
            "Not Authorize to call this function"
        );
        _pause();
    }

    function unpause() public {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()) ||
                hasRole(PAUSER_ROLE, _msgSender()),
            "Not Authorize to call this function"
        );
        _unpause();
    }

    function normalize(uint256 amount, uint256 decimals)
        external
        pure
        returns (uint256)
    {
        return (amount * 1e18) / (10**decimals);
    }

    function denormalize(uint256 amount, uint256 decimals)
        external
        pure
        returns (uint256)
    {
        return amount * (10**decimals) / (1e18);
    }

    function allPoolAddresses() external view returns(address[] memory){
        return liquidityPools;
    } 

    function allStablecoinAddresses() external view returns(address[] memory) {
        return stablecoins;
    }
}