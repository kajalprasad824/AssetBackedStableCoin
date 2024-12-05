// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
// import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";

interface IERC20Metadata is IERC20 {
    function decimals() external view returns (uint8);
}

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
    // PausableUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    // using SafeMath for uint256;

    bytes32 public constant PAUSER_ROLE =
        keccak256(abi.encodePacked("PAUSER_ROLE"));

    IERC20 public USDN;
    IERC20 public stablecoin;
    INuChainFactory public factory;

    uint256 public totalLiquidityUSDN;
    uint256 public totalLiquidityStablecoin;

    uint8 private stablecoinDecimal;

    struct LiquidityProviderInfo {
        uint256 liquidityUSDN;
        uint256 liquidityStablecoin;
        uint256 rewardLastTime;
    }

    mapping(address => LiquidityProviderInfo) public liquidityProviderInfo;

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

        // __Pausable_init();
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

    modifier rewardCoolDown(address _user) {
        LiquidityProviderInfo memory liquidity = liquidityProviderInfo[_user];
        require(
            block.timestamp >=
                liquidity.rewardLastTime + factory.rewardPeriod(),
            "Reward cooldown period not met"
        );
        _;
    }

    modifier whenPoolNotPaused() {
        require(factory.paused() == false, "Liquidity Pools are paused");
        _;
    }

    // ======================
    // Liquidity Management
    // ======================

    //Add Liquidity to the pool
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

    //Remove Liquidity From The Pool
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

        }else {
            uint256 normalizeStablecoin = factory.normalize(_amountIn, stablecoinDecimal);
            feeInUSDN = (normalizeStablecoin * factory.tradingFee()) / 10000;

            _amountOut = normalizeStablecoin - feeInUSDN;

            require(totalLiquidityUSDN >= _amountOut, "Insufficient Liquidity for USDN"); 
        }

        totalLiquidityStablecoin += _amountIn;
        totalLiquidityUSDN -= _amountOut;

        require(IERC20(_tokenIn).transferFrom(msg.sender,address(this),_amountOut), "Input token transfer failed");
        require(IERC20(_tokenOut).transfer(msg.sender,_amountOut),"Output token transfer failed");

        emit Swapped(msg.sender, _tokenIn, _tokenOut, _amountIn,_amountOut);

    }

    // ====================
    // Reward Management
    // ====================

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

    // Function to withdraw token
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
