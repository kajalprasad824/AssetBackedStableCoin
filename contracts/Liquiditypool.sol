// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";


/// Interface to fetch decimal of stablecoin
interface IERC20Metadata is IERC20 {
    function decimals() external view returns (uint8);
}

/// Interface for the factory contract
interface INuChainFactory {
    function tradingFee() external view returns (uint256);

    function rewardRate() external view returns (uint256);

    function rewardPeriod() external view returns (uint256);

    function paused() external view returns (bool);

    function normalize(uint256 amount, uint256 decimals)
        external
        view
        returns (uint256);

    function denormalize(uint256 amount, uint256 decimals)
        external
        view
        returns (uint256);
}

contract Liquiditypool is
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    
    IERC20 public USDN; /// USDN contract address
    IERC20 public stablecoin;  ///Paired stablecoin contract address
    INuChainFactory public factory; /// NuChain Factory contract address

    uint256 public totalLiquidityUSDN; /// Returns the value of total liquidity of USDN
    uint256 public totalLiquidityStablecoin; ///Returns the value of total liquidity of paired stablecoin

    uint8 private stablecoinDecimal; /// Stores the decimal of paired stablecoin

    /// @struct store the info of Liquidity provider
    struct LiquidityProviderInfo {
        uint256 liquidityUSDN;
        uint256 liquidityStablecoin;
        uint256 rewardLastTime;
    }
    /// Liquidity Provider => Liquidity Provider Info
    mapping(address => LiquidityProviderInfo) public liquidityProviderInfo;

    /// Events of the contract
    event LiquidityAdded(
        address indexed user,
        uint256 amountUSDN,
        uint256 amountStablecoin
    );

    event LiquidityRemoved(
        address indexed user,
        uint256 amountUSDN,
        uint256 amountStablecoin
    );

    event Swapped(
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    event RewardClaimed(address indexed user, uint256 reward);

    event PegRebalanced(uint256 amount, string direction);

    /// @custom:oz-upgrades-unsafe-allow constructor
    // constructor() {
    //     _disableInitializers();
    // }

    /* 
         @notice initialize the function
         @param _defaultAdmin Default Admin of the contract
         @param _USDN contract address of USDN
         @param _stablecoin paired stable coin contract address
         @param _factory NuChain Factory contract address

    */
    function initialize(
        address _defaultAdmin,
        address _USDN,
        address _stablecoin,
        address _factory
    ) public initializer {
        require(
            _USDN != address(0) && _stablecoin != address(0),
            "USDN or stablecoin address can't be zero"
        );

        __AccessControl_init();
        __ReentrancyGuard_init();

        USDN = IERC20(_USDN);
        stablecoin = IERC20(_stablecoin);
        factory = INuChainFactory(_factory);
        stablecoinDecimal = IERC20Metadata(_stablecoin).decimals();

        _grantRole(DEFAULT_ADMIN_ROLE, _defaultAdmin);
    }

    //Modifier to ensure valid token amount
    modifier validAmount(uint256 _amount) {
        require(_amount > 0, "Invalid Amount");
        _;
    }

    //Modifier to ensure reward period is complete 
    modifier rewardCoolDown(address _user) {
        LiquidityProviderInfo memory liquidity = liquidityProviderInfo[_user];
        require(
            block.timestamp >=
                liquidity.rewardLastTime + factory.rewardPeriod(),
            "Reward cooldown period not met"
        );
        _;
    }

    //Modifier to ensure that liquidity pool is not paused
    modifier whenPoolNotPaused() {
        require(factory.paused() == false, "Liquidity Pools are paused");
        _;
    }

    // ======================
    // Liquidity Management
    // ======================

    /*
        @notice Add Liquidity to the pool
        @param _amountUSDN USDN amount that user want to add
        @param _amountStablecoin amount of paired stablecoin that user want to add
    */
    function addLiquidity(uint256 _amountUSDN, uint256 _amountStablecoin)
        external
        whenPoolNotPaused
        nonReentrant
        validAmount(_amountUSDN)
        validAmount(_amountStablecoin)
    {
        require(
            USDN.transferFrom(msg.sender, address(this), _amountUSDN),
            "USDN transfer faailed"
        );
        require(
            stablecoin.transferFrom(
                msg.sender,
                address(this),
                _amountStablecoin
            ),
            "Stablecoin transfer failed"
        );

        uint256 totalReward;

        LiquidityProviderInfo storage liquidity = liquidityProviderInfo[
            msg.sender
        ];

        if (liquidity.liquidityUSDN > 0 || liquidity.liquidityStablecoin > 0) {
            totalReward = calculateReward(msg.sender);
            require(
                USDN.transfer(msg.sender, totalReward),
                "USDN transfer failed"
            );
        }

        liquidity.liquidityUSDN += _amountUSDN;
        liquidity.liquidityStablecoin += _amountStablecoin;
        totalLiquidityUSDN += _amountUSDN;
        totalLiquidityUSDN -= totalReward;
        totalLiquidityStablecoin += _amountStablecoin;
        liquidity.rewardLastTime = block.timestamp;

        emit LiquidityAdded(msg.sender, _amountUSDN, _amountStablecoin);
    }

    /*
        @notice Add Liquidity to the pool
        @param _amountUSDN USDN amount that user want to remove
        @param _amountStablecoin amount of paired stablecoin that user want to remove
    */
    function removeLiquidity(uint256 _amountUSDN, uint256 _amountStablecoin)
        external
        whenPoolNotPaused
        nonReentrant
        validAmount(_amountUSDN)
        validAmount(_amountStablecoin)
    {
        LiquidityProviderInfo storage liquidity = liquidityProviderInfo[
            msg.sender
        ];

        require(
            liquidity.liquidityUSDN >= _amountUSDN,
            "Insufficient USDN balance"
        );

        require(
            liquidity.liquidityStablecoin >= _amountStablecoin,
            "Insufficient Stablecoin balance"
        );

        uint256 totalReward = calculateReward(msg.sender);

        require(USDN.transfer(msg.sender, totalReward), "USDN Transfer Failed");

        liquidity.liquidityUSDN -= _amountUSDN;
        liquidity.liquidityStablecoin -= _amountStablecoin;
        totalLiquidityUSDN -= _amountUSDN;
        totalLiquidityUSDN -= totalReward;
        totalLiquidityStablecoin -= _amountStablecoin;
        liquidity.rewardLastTime = block.timestamp;

        require(USDN.transfer(msg.sender, _amountUSDN), "USDN transfer Failed");
        require(
            stablecoin.transfer(msg.sender, _amountStablecoin),
            "Stablecoin transfer Failed"
        );

        emit LiquidityRemoved(msg.sender, _amountUSDN, _amountStablecoin);
    }

    //=====================
    // Trading(Swapping)
    //=====================

    /*
        @notice Swapping of stablecoins
        @param _tokenIn Address of the token you want to swap in
        @param _tokenOut Address of the token you want to swap out
        @param _amountIn Amount of token you want to swap
    */
    function swap(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn
    )
        external
        whenPoolNotPaused
        nonReentrant
        validAmount(_amountIn)
        returns (uint256 _amountOut)
    {
        require(
            (_tokenIn == address(USDN) && _tokenOut == address(stablecoin)) ||
                (_tokenIn == address(stablecoin) && _tokenOut == address(USDN)),
            "Invalid token pair"
        );

        uint256 feeInUSDN;

        if (_tokenIn == address(USDN)) {
            feeInUSDN = (_amountIn * factory.tradingFee()) / 10000;
            uint256 amountInAfterFee = _amountIn - feeInUSDN;

            _amountOut = factory.denormalize(
                amountInAfterFee,
                stablecoinDecimal
            );

            require(totalLiquidityStablecoin >= _amountOut, "Insufficient Liquidty for Stablecoin");
            totalLiquidityStablecoin -= _amountOut;
            totalLiquidityUSDN += _amountIn;
 
        }else {
            uint256 normalizeStablecoin = factory.normalize(_amountIn, stablecoinDecimal);
            feeInUSDN = (normalizeStablecoin * factory.tradingFee()) / 10000;

            _amountOut = normalizeStablecoin - feeInUSDN;

            require(totalLiquidityUSDN >= _amountOut, "Insufficient Liquidity for USDN"); 

            totalLiquidityStablecoin += _amountIn;
            totalLiquidityUSDN -= _amountOut;
        }

        require(IERC20(_tokenIn).transferFrom(msg.sender,address(this),_amountIn), "Input token transfer failed");
        require(IERC20(_tokenOut).transfer(msg.sender,_amountOut),"Output token transfer failed");

        emit Swapped(msg.sender, _tokenIn, _tokenOut, _amountIn,_amountOut);

    }

    // ====================
    // Reward Management
    // ====================

    /*
        @notice Fuction to calculate the reward
        @param _user address of the liquidity provider for which we want to calculate reward
        @returns reward of the liquidity provider
    */

    function calculateReward(address _user) public view returns (uint256) {
        LiquidityProviderInfo memory liquidity = liquidityProviderInfo[_user];
        uint256 timeLapse = block.timestamp - liquidity.rewardLastTime;
        uint256 numToMul = timeLapse / factory.rewardPeriod();

        uint256 totalLiquidity = totalLiquidityUSDN + totalLiquidityStablecoin;

        require(totalLiquidity > 0, "No Liquidity in Pool");

        uint256 userShare = ((liquidity.liquidityUSDN +
            factory.normalize(
                liquidity.liquidityStablecoin,
                stablecoinDecimal
            )) * 1e18) / totalLiquidity;

        uint256 totalUserShare = numToMul * userShare;

        return (totalUserShare * factory.rewardRate()) / 1e18;
    }

    /*
        @notice Fuction to claim the reward
    */
    function claimReward() external whenPoolNotPaused nonReentrant rewardCoolDown(msg.sender){
        LiquidityProviderInfo storage liquidity = liquidityProviderInfo[
            _msgSender()
        ];

        uint256 reward = calculateReward(msg.sender);
        require(reward > 0, "No rewards to claim");
        require(USDN.transfer(msg.sender, reward),"Reward transfer failed");
        liquidity.rewardLastTime = block.timestamp;
        totalLiquidityUSDN -= reward;

        emit RewardClaimed(msg.sender, reward);

    }

    // =======================
    // Peg Rebalancing
    // =======================

    /*
        @notice function to rebalance the liquidity pool
        @param _amount The amount default admin want to add
        @param isAddLiquidityToUSDN true if want to add USDN else false
        only default admin can call this function
    */
    function rebalancePeg(uint _amount, bool isAddLiquidityToUSDN) external onlyRole(DEFAULT_ADMIN_ROLE){
        if(isAddLiquidityToUSDN) {
            require(USDN.transferFrom(msg.sender,address(this),_amount),"USDN transfer failed");
            totalLiquidityUSDN += _amount;
            emit PegRebalanced(_amount, "Added to USDN");
        }else{
            require(stablecoin.transferFrom(msg.sender,address(this),_amount),"Stablecoin transfer failed");
            totalLiquidityStablecoin += _amount;
            emit PegRebalanced(_amount, "Added to Stablecoin");
        }
    }

    /*
        @notice function to withdraw the token
        only default admin can call this function
    */
    function withdrawToken(address _to,address _token,uint256 _amount) external onlyRole(DEFAULT_ADMIN_ROLE){
        require(
            IERC20(_token).transfer(_to, _amount),
            "Emergency withdrawal failed"
        );

        if (_token == address(USDN)) {
            totalLiquidityUSDN -= _amount;
        } else {
            totalLiquidityStablecoin -= _amount;
        }
    }
}
