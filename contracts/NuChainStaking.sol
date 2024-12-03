// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract NuChainStaking is
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    IERC20 public stakingToken;

    uint256 public rewardRatePerDay; // Reward rate per day in basis points (1e5 = 100%)
    uint256 public minTransactionAmount; // Minimum staking amount in raw token (18 decimals)

    struct StakerInfo {
        uint256 amount; // Amount staked
        uint256 reward; // Pending reward
        uint256 lastClaimTime; // Last reward claim time
    }
    mapping(address => StakerInfo) public stakers;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 reward);
    event RewardRateUpdated(uint256 newRate);
    event MinimumTransactionAmountUpdated(uint256 amount);

    modifier updateReward(address user) {
        StakerInfo storage staker = stakers[user];
        if (
            staker.amount >= minTransactionAmount &&
            block.timestamp > staker.lastClaimTime
        ) {
            uint256 timeElapsed = (block.timestamp - staker.lastClaimTime) /
                1 days;
            uint256 userReward = (staker.amount *
                timeElapsed *
                rewardRatePerDay) / 1e5;
            staker.reward += userReward;
        }
        _;
    }

    function initialize(
        address _stakingToken,
        address admin,
        uint _rewardRatePerDay,
        uint _minTransactionAmount
    ) public initializer {
        require(_stakingToken != address(0), "Invalid token address");
        require(admin != address(0), "Invalid admin address");
        require(
            _rewardRatePerDay != 0 && _minTransactionAmount != 0,
            "Reward Rate and Minimum transaction amount cannot be zero"
        );

        __AccessControl_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        stakingToken = IERC20(_stakingToken);
        rewardRatePerDay = _rewardRatePerDay;
        minTransactionAmount = _minTransactionAmount;
    }

    function stake(
        uint256 amount
    ) external nonReentrant updateReward(msg.sender) {
        require(amount >= minTransactionAmount, "Amount too low");

        StakerInfo storage staker = stakers[msg.sender];

        // If there are pending rewards, transfer them first
        if (staker.reward > 0) {
            uint256 pendingReward = staker.reward;
            staker.reward = 0; // Reset reward before transfer
            staker.lastClaimTime = block.timestamp;
            emit RewardClaimed(msg.sender, pendingReward);
            stakingToken.transfer(msg.sender, pendingReward);
        }

        // Transfer staked amount to the contract
        stakingToken.transferFrom(msg.sender, address(this), amount);
        staker.amount += amount;
        staker.lastClaimTime = block.timestamp;

        emit Staked(msg.sender, amount);
    }

    function withdraw(
        uint256 amount
    ) external nonReentrant updateReward(msg.sender) {
        require(amount >= minTransactionAmount, "Amount too low");

        StakerInfo storage staker = stakers[msg.sender];
        require(staker.amount >= amount, "Insufficient balance");

        // Transfer pending rewards before withdrawal
        if (staker.reward > 0) {
            uint256 pendingReward = staker.reward;
            staker.reward = 0; // Reset reward before transfer
            staker.lastClaimTime = block.timestamp;
            emit RewardClaimed(msg.sender, pendingReward);
            stakingToken.transfer(msg.sender, pendingReward);
        }

        // Withdraw staked amount
        staker.amount -= amount;
        stakingToken.transfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    function claimReward() external nonReentrant updateReward(msg.sender) {
        StakerInfo storage staker = stakers[msg.sender];
        uint256 pendingReward = staker.reward;

        require(
            pendingReward > 0 &&
                block.timestamp > staker.lastClaimTime + 1 days,
            "No reward to claim."
        );

        // Reset reward before transferring
        staker.reward = 0;
        staker.lastClaimTime = block.timestamp;

        // Emit the reward claim event first, before transferring tokens
        emit RewardClaimed(msg.sender, pendingReward);

        // Transfer the pending reward
        stakingToken.transfer(msg.sender, pendingReward);
    }

    function updateRewardRate(uint256 newRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        rewardRatePerDay = newRate;
        emit RewardRateUpdated(newRate);
    }

    function updateTransactionAmount(
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minTransactionAmount = amount * 1e18;
        emit MinimumTransactionAmountUpdated(amount);
    }

    function viewPendingReward(address user) external view returns (uint256) {
        StakerInfo storage staker = stakers[user];
        if (block.timestamp > staker.lastClaimTime) {
            uint256 timeElapsed = (block.timestamp - staker.lastClaimTime) /
                1 days;
            return (staker.amount * timeElapsed * rewardRatePerDay) / 1e5;
        }
        return 0;
    }
}

//0x003187bafefc1267364fbffe50e58a32949f2274 
