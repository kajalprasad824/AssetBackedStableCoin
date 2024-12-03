// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract NuChainLiquidityPool is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant PAUSER_ROLE =
        keccak256(abi.encodePacked("PAUSER_ROLE"));

    IERC20 public USDN; // Stablecoin A (e.g., USDN)
    IERC20 public stablecoinB; // Stablecoin B (e.g., USDT)
    uint256 public tradingFee; // Trading fee in basis points (100 = 1%)
    uint256 public rewardRate; // Reward rate for LPs
    uint256 public totalLiquidityUSDN; // Total liquidity of Stablecoin A
    uint256 public totalLiquidityB; // Total liquidity of Stablecoin B
    uint256 public pegThreshold; // Threshold for triggering peg rebalance (in basis points)

    struct LiquidityProviderInfo {
        uint256 liquidityUSDN; // Liquidity provided by users for USDN
        uint256 liquidityB; // Liquidity provided by users for Stablecoin B
        uint256 claimRewardLastTime; // Liquidity Provider claim reward last time
    }

    mapping(address => LiquidityProviderInfo) public liquidityProviderInfo;

    // mapping(address => uint256) public liquidityUSDN; // Liquidity provided by users for Stablecoin A
    // mapping(address => uint256) public liquidityB; // Liquidity provided by users for Stablecoin B
    // mapping(address => uint256) public rewards; // Accumulated rewards for liquidity providers

    event LiquidityAdded(
        address indexed user,
        uint256 amountUSDN,
        uint256 amountB
    );
    event LiquidityRemoved(
        address indexed user,
        uint256 amountUSDN,
        uint256 amountB
    );
    event Swapped(
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    event RewardClaimed(address indexed user, uint256 reward);
    event PegRebalanced(uint256 amountUSDNdjusted, string direction);

    /// @custom:oz-upgrades-unsafe-allow constructor
    // constructor() {
    //     _disableInitializers();
    // }

    function initialize(
        address defaultAdmin,
        address _USDN,
        address _stablecoinB,
        uint256 _tradingFee,
        uint256 _rewardRate,
        uint256 _pegThreshold
    ) public initializer {
        require(
            _USDN != address(0) && _stablecoinB != address(0),
            "Stablecoin or USDN address can't be zero"
        );

        require(
            _tradingFee != 0 && _rewardRate != 0 && _pegThreshold != 0,
            "Please check value og trading fee, reward rate and peg threshold"
        );
        __Pausable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();

        USDN = IERC20(_USDN);
        stablecoinB = IERC20(_stablecoinB);
        tradingFee = _tradingFee; // Default fee: 0.3% = 30 basis points
        rewardRate = _rewardRate; // Reward rate for LPs
        pegThreshold = _pegThreshold; // Default threshold: 100 basis points (1%)

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
    }

    // Modifier to ensure valid token amount
    modifier validAmount(uint256 amount) {
        require(amount > 0, "Invalid amount");
        _;
    }

    // Modifier to ensure the peg is within acceptable thresholds
    modifier pegWithinThreshold(uint256 price) {
        uint256 deviation = (price > 1e18) ? price - 1e18 : 1e18 - price; // Assuming price is scaled by 1e18
        require(deviation <= pegThreshold, "Price exceeds peg threshold");
        _;
    }

    modifier rewardCooldown(address user) {
        LiquidityProviderInfo memory liquidity = liquidityProviderInfo[user];
        require(
            block.timestamp >= liquidity.claimRewardLastTime + 1 days,
            "Reward cooldown period not met"
        );
        _;
    }

    // =======================
    // Liquidity Management
    // =======================

    // Add liquidity to the pool
    function addLiquidity(uint256 amountUSDN, uint256 amountB)
        external
        whenNotPaused
        nonReentrant
        validAmount(amountUSDN)
        validAmount(amountB)     
    {
        require(
            USDN.transferFrom(msg.sender, address(this), amountUSDN),
            "Stablecoin A transfer failed"
        );
        require(
            stablecoinB.transferFrom(msg.sender, address(this), amountB),
            "Stablecoin B transfer failed"
        );

        LiquidityProviderInfo storage liquidity = liquidityProviderInfo[
            _msgSender()
        ];

        // Claim rewards if user already has liquidity
        if (liquidity.liquidityUSDN > 0 || liquidity.liquidityB > 0) {
            uint totalReward = calculateReward(_msgSender());
            require(
            USDN.transfer(msg.sender, totalReward),
            "USDN transfer failed"
        );

        }

        liquidity.liquidityUSDN += amountUSDN;
        liquidity.liquidityB += amountB;
        totalLiquidityUSDN += amountUSDN;
        totalLiquidityB += amountB;
        liquidity.claimRewardLastTime = block.timestamp;

        emit LiquidityAdded(msg.sender, amountUSDN, amountB);
    }

    // Remove liquidity from the pool
    function removeLiquidity(uint256 amountUSDN, uint256 amountB)
        external
        whenNotPaused
        nonReentrant
        validAmount(amountUSDN)
        validAmount(amountB)
    {
        LiquidityProviderInfo storage liquidity = liquidityProviderInfo[
            _msgSender()
        ];
        require(
            liquidity.liquidityUSDN >= amountUSDN,
            "Insufficient USDN balance"
        );
        require(
            liquidity.liquidityB >= amountB,
            "Insufficient Stablecoin B balance"
        );

        uint totalReward = calculateReward(_msgSender());

        require(
            USDN.transfer(msg.sender, totalReward),
            "USDN transfer failed"
        );

        liquidity.liquidityUSDN -= amountUSDN;
        liquidity.liquidityB -= amountB;
        totalLiquidityUSDN -= amountUSDN;
        totalLiquidityB -= amountB;
        liquidity.claimRewardLastTime = block.timestamp;

        require(
            USDN.transfer(msg.sender, amountUSDN),
            "USDN transfer failed"
        );

        require(
            stablecoinB.transfer(msg.sender, amountB),
            "Stablecoin B transfer failed"
        );

        emit LiquidityRemoved(msg.sender, amountUSDN, amountB);
    }

    // =======================
    // Trading (Swapping)
    // =======================

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external whenNotPaused nonReentrant validAmount(amountIn) returns (uint256 amountOut) {
        require(
            (tokenIn == address(USDN) && tokenOut == address(stablecoinB)) ||
                (tokenIn == address(stablecoinB) && tokenOut == address(USDN)),
            "Invalid token pair"
        );

        uint feeInUSDN;

        if (tokenIn == address(USDN)) {

            // Fee is directly deducted in USDN
        feeInUSDN = (amountIn * tradingFee) / 10000;

        uint256 amountInAfterFee = amountIn - feeInUSDN;
            require(
                totalLiquidityB >= amountInAfterFee,
                "Insufficient liquidity for Stablecoin B"
            );
            amountOut = amountInAfterFee; // Assuming a 1:1 peg between stablecoins
            totalLiquidityUSDN += amountInAfterFee;
            totalLiquidityUSDN += feeInUSDN;
            totalLiquidityB -= amountOut;
        } else {

            
            feeInUSDN = (amountIn * tradingFee) / 10000;
            amountOut = amountIn - feeInUSDN;

        require(
            totalLiquidityUSDN >= amountOut,
            "Insufficient liquidity for USDN"
        );

        
        totalLiquidityB += amountIn; // Add incoming stablecoinB
        totalLiquidityUSDN -= amountOut; // Deduct USDN after fee

        }

    
        require(
            IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn),
            "Input token transfer failed"
        );
        require(
            IERC20(tokenOut).transfer(msg.sender, amountOut),
            "Output token transfer failed"
        );

        emit Swapped(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }

    // =======================
    // Rewards Management
    // =======================

    function calculateReward(address user) public view returns (uint256) {
        LiquidityProviderInfo storage liquidity = liquidityProviderInfo[user];
        uint256 timeLapse = block.timestamp - liquidity.claimRewardLastTime;
        uint256 numOfDays = timeLapse / 1 days;
        uint256 totalLiquidity = totalLiquidityUSDN + totalLiquidityB;
        require(totalLiquidity > 0, "No liquidity in pool");

        uint256 userShare = ((liquidity.liquidityUSDN + liquidity.liquidityB) *
            1e18) / totalLiquidity;
        uint256 totalUserShare = numOfDays * userShare;
        return (totalUserShare * rewardRate) / 1e18;
    }

    function claimReward() public whenNotPaused nonReentrant rewardCooldown(_msgSender()){
        LiquidityProviderInfo storage liquidity = liquidityProviderInfo[
            _msgSender()
        ];
        uint256 reward = calculateReward(msg.sender);
        require(reward > 0, "No rewards to claim");
        require(USDN.transfer(msg.sender, reward), "Reward transfer failed");
        liquidity.claimRewardLastTime = block.timestamp;
        totalLiquidityUSDN -= reward;

        emit RewardClaimed(msg.sender, reward);
    }

    // =======================
    // Peg Monitoring & Rebalancing
    // =======================

    function checkPeg(uint256 price)
        external
        view
        pegWithinThreshold(price)
        returns (bool)
    {
        return true; // Peg is within acceptable range
    }

    function rebalancePeg(uint256 amount, bool isAddLiquidityToUSDN) external onlyRole(DEFAULT_ADMIN_ROLE){
        if (isAddLiquidityToUSDN) {
            require(
                totalLiquidityB >= amount,
                "Insufficient Stablecoin B liquidity"
            );
            totalLiquidityUSDN += amount;
            totalLiquidityB -= amount;
            emit PegRebalanced(amount, "Added to Stablecoin A");
        } else {
            require(
                totalLiquidityUSDN >= amount,
                "Insufficient Stablecoin A liquidity"
            );
            totalLiquidityB += amount;
            totalLiquidityUSDN -= amount;
            emit PegRebalanced(amount, "Added to Stablecoin B");
        }
    }

    // =======================
    // Administrative Functions
    // =======================

    function updateTradingFee(uint256 newFee)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        tradingFee = newFee;
    }

    function updateRewardRate(uint256 newRate)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        rewardRate = newRate;
    }

    function updatePegThreshold(uint256 newThreshold)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(newThreshold > 0, "Invalid peg threshold");
        pegThreshold = newThreshold;
    }

    function withdrawToken(
        address _to,
        address token,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            IERC20(token).transfer(_to, amount),
            "Emergency withdrawal failed"
        );

        if(token == address(USDN)){
            totalLiquidityUSDN -= amount;
        }
        else{
            totalLiquidityB -= amount;
        }
    }

    // =======================
    // View Functions
    // =======================

    function getUserLiquidity(address user)
        external
        view
        returns (uint256 amountUSDN, uint256 amountB)
    {
        LiquidityProviderInfo memory liquidity = liquidityProviderInfo[user];
        return (liquidity.liquidityUSDN, liquidity.liquidityB);
    }

    function getTotalLiquidity()
        external
        view
        returns (uint256 totalA, uint256 totalB)
    {
        return (totalLiquidityUSDN, totalLiquidityB);
    }

    function pause() public {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()) ||
                hasRole(PAUSER_ROLE, _msgSender()),
            "Not Authorize to call this function"
        );
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()) ||
                hasRole(PAUSER_ROLE, _msgSender()),
            "Not Authorize to call this function"
        );
        _unpause();
    }
}
