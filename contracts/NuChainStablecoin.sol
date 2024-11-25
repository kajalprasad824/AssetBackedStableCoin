// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.19;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC20PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import {ERC20BurnableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
// import "@openzeppelin/contracts/utils/math/SafeMath.sol";

library SafeMath {
    /**
     * @dev Returns the addition of two unsigned integers, with an overflow flag.
     *
     * _Available since v3.4._
     */
    function tryAdd(
        uint256 a,
        uint256 b
    ) internal pure returns (bool, uint256) {
        unchecked {
            uint256 c = a + b;
            if (c < a) return (false, 0);
            return (true, c);
        }
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, with an overflow flag.
     *
     * _Available since v3.4._
     */
    function trySub(
        uint256 a,
        uint256 b
    ) internal pure returns (bool, uint256) {
        unchecked {
            if (b > a) return (false, 0);
            return (true, a - b);
        }
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, with an overflow flag.
     *
     * _Available since v3.4._
     */
    function tryMul(
        uint256 a,
        uint256 b
    ) internal pure returns (bool, uint256) {
        unchecked {
            // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
            // benefit is lost if 'b' is also tested.
            // See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522
            if (a == 0) return (true, 0);
            uint256 c = a * b;
            if (c / a != b) return (false, 0);
            return (true, c);
        }
    }

    /**
     * @dev Returns the division of two unsigned integers, with a division by zero flag.
     *
     * _Available since v3.4._
     */
    function tryDiv(
        uint256 a,
        uint256 b
    ) internal pure returns (bool, uint256) {
        unchecked {
            if (b == 0) return (false, 0);
            return (true, a / b);
        }
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers, with a division by zero flag.
     *
     * _Available since v3.4._
     */
    function tryMod(
        uint256 a,
        uint256 b
    ) internal pure returns (bool, uint256) {
        unchecked {
            if (b == 0) return (false, 0);
            return (true, a % b);
        }
    }

    /**
     * @dev Returns the addition of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `+` operator.
     *
     * Requirements:
     *
     * - Addition cannot overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        return a + b;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     *
     * - Subtraction cannot overflow.
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return a - b;
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `*` operator.
     *
     * Requirements:
     *
     * - Multiplication cannot overflow.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        return a * b;
    }

    /**
     * @dev Returns the integer division of two unsigned integers, reverting on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator.
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return a / b;
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * reverting when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        return a % b;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting with custom message on
     * overflow (when the result is negative).
     *
     * CAUTION: This function is deprecated because it requires allocating memory for the error
     * message unnecessarily. For custom revert reasons use {trySub}.
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     *
     * - Subtraction cannot overflow.
     */
    function sub(
        uint256 a,
        uint256 b,
        string memory errorMessage
    ) internal pure returns (uint256) {
        unchecked {
            require(b <= a, errorMessage);
            return a - b;
        }
    }

    /**
     * @dev Returns the integer division of two unsigned integers, reverting with custom message on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function div(
        uint256 a,
        uint256 b,
        string memory errorMessage
    ) internal pure returns (uint256) {
        unchecked {
            require(b > 0, errorMessage);
            return a / b;
        }
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * reverting with custom message when dividing by zero.
     *
     * CAUTION: This function is deprecated because it requires allocating memory for the error
     * message unnecessarily. For custom revert reasons use {tryMod}.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function mod(
        uint256 a,
        uint256 b,
        string memory errorMessage
    ) internal pure returns (uint256) {
        unchecked {
            require(b > 0, errorMessage);
            return a % b;
        }
    }
}

interface IReserveAuditor {
    function verifyReserves(
        uint256 requiredReserve
    ) external view returns (bool);
}

/**
 * @title NuChainStablecoin
 * @dev USDN is a feature-rich, reserve-backed stablecoin:
 * - Capped at 2 billion tokens.
 * - Minting and burning tied to reserves.
 * - Role-based access control for security.
 * - Pausing and freezing mechanisms for compliance.
 * - Fee deduction for transfers.
 */
contract NuChainStablecoin is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    AccessControlUpgradeable
{
    using SafeMath for uint256;

    // Constants
    uint256 public constant MAX_SUPPLY = 2_000_000_000 * 1e18; // 2 billion tokens
    uint256 public constant INITIAL_MINT = 1_000_000_000 * 1e18; // 1 billion tokens

    // Roles
    bytes32 public constant ADMIN_ROLE = (
        keccak256(abi.encodePacked("ADMIN_ROLE"))
    );
    bytes32 public constant SUPPLY_CONTROLLER_ROLE = (
        keccak256(abi.encodePacked("SUPPLY_CONTROLLER_ROLE"))
    );
    bytes32 public constant ASSET_PROTECTION_ROLE = (
        keccak256(abi.encodePacked("ASSET_PROTECTION_ROLE"))
    );
    bytes32 public constant PAUSER_ROLE = (
        keccak256(abi.encodePacked("PAUSER_ROLE"))
    );
    bytes32 public constant TREASURY_ROLE = (
        keccak256(abi.encodePacked("TREASURY_ROLE"))
    );
    bytes32 public constant WHITELIST_ROLE = (
        keccak256(abi.encodePacked("WHITELIST_ROLE"))
    );

    // Freezing functionality
    mapping(address => bool) public _frozen;

    // Fee mechanism
    uint256 public transactionFeePercentage; // Fee percentage in basis points (e.g., 100 = 1%)
    address public treasuryWallet;
    bool public transactionFeeEnabled;

    // Reserve data
    uint256 public reserveRatio; // Reserve ratio (1e18 = 100%)
    uint256 public balanceReserves;
    IReserveAuditor public reserveAuditor;

    // Events
    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);
    event AddressFrozen(address indexed account);
    event AddressUnfrozen(address indexed account);
    event FrozenAddressWiped(address indexed account, uint256 balance);
    event ReserveUpdated(uint256 newReserves);
    event ReserveRatioUpdated(uint256 newRatio);
    event FeePercentageUpdated(uint256 newFee);
    event TreasuryWalletUpdated(address newWallet);
    event TransactionFeeUpdated(bool enabled);
    event ReserveVerified(
        uint256 requiredReserve,
        uint256 actualReserve,
        bool isSufficient
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    // constructor() {
    //     _disableInitializers();
    // }

    function initialize(
        address defaultAdminaddress,
        address _reserveAuditor,
        address _treasuryWallet
    ) public initializer {
        require(defaultAdminaddress != address(0), "Invalid admin address");
        require(
            _reserveAuditor != address(0),
            "Invalid reserve auditor address"
        );
        require(
            _treasuryWallet != address(0),
            "Invalid treasury wallet address"
        );
        __ERC20_init("NuChain Stablecoin", "USDN");
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdminaddress);

        // Assign initial settings
        reserveAuditor = IReserveAuditor(_reserveAuditor);
        treasuryWallet = _treasuryWallet;

        reserveRatio = 1e18; // Default 1:1 reserve ratio
        transactionFeePercentage = 0; // Default no transaction fee

        // Initial mint
        _mint(defaultAdminaddress, INITIAL_MINT);
    }

    // Minting new tokens
    function mint(address to, uint256 amount) external whenNotPaused {
        require(
            totalSupply().add(amount) <= MAX_SUPPLY,
            "Mint exceeds MAX_SUPPLY"
        );

        require(
            hasRole(SUPPLY_CONTROLLER_ROLE, _msgSender()) ||
                hasRole(ADMIN_ROLE, _msgSender()) ||
                hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Not Authorize to call this function"
        );

        uint256 requiredReserve = amount.mul(reserveRatio).div(1e18);
        require(balanceReserves >= requiredReserve, "Insufficient reserves");
        require(
            reserveAuditor.verifyReserves(requiredReserve + totalSupply()),
            "Reserve verification failed"
        );

        _mint(to, amount);

        emit ReserveVerified(
            requiredReserve,
            balanceReserves,
            reserveAuditor.verifyReserves(requiredReserve)
        );
        balanceReserves = balanceReserves.sub(requiredReserve);

        emit Minted(to, amount);
    }

    // Burn tokens
    function burn(uint256 amount) public override whenNotPaused {
        require(
            hasRole(SUPPLY_CONTROLLER_ROLE, _msgSender()) ||
                hasRole(ADMIN_ROLE, _msgSender()) ||
                hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Not Authorize to call this function"
        );
        uint256 releaseAmount = amount.mul(reserveRatio).div(1e18);

        super.burn(amount);
        balanceReserves = balanceReserves.add(releaseAmount);

        emit Burned(msg.sender, amount);
    }

    // Update reserves
    function updateReserves(uint256 newReserves) external {
        require(
            hasRole(ADMIN_ROLE, _msgSender()) ||
                hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Not Authorize to call this function"
        );

        require(newReserves != 0, "New Reserve value can't be equal to zero");
        balanceReserves = newReserves;
        emit ReserveUpdated(newReserves);
    }

    // Update reserve ratio
    function setReserveRatio(uint256 newRatio) external {
        require(newRatio > 0, "Reserve ratio must be greater than zero");
        require(
            hasRole(ADMIN_ROLE, _msgSender()) ||
                hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Not Authorize to call this function"
        );
        reserveRatio = newRatio;
        emit ReserveRatioUpdated(newRatio);
    }

    // Freezing functionality
    function freeze(address account) external {
        require(
            hasRole(ASSET_PROTECTION_ROLE, _msgSender()) ||
                hasRole(ADMIN_ROLE, _msgSender()) ||
                hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Not Authorize to call this function"
        );

        require(!_frozen[account], "Account already frozen");
        _frozen[account] = true;
        emit AddressFrozen(account);
    }

    function unfreeze(address account) external {
        require(
            hasRole(ASSET_PROTECTION_ROLE, _msgSender()) ||
                hasRole(ADMIN_ROLE, _msgSender()) ||
                hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Not Authorize to call this function"
        );
        require(_frozen[account], "Account is not frozen");
        _frozen[account] = false;
        emit AddressUnfrozen(account);
    }

    function wipeFrozenAddress(address account) external {
        require(
            hasRole(ASSET_PROTECTION_ROLE, _msgSender()) ||
                hasRole(ADMIN_ROLE, _msgSender()) ||
                hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Not Authorize to call this function"
        );
        require(_frozen[account], "Account is not frozen");
        uint256 balance = balanceOf(account);
        _burn(account, balance);
        emit FrozenAddressWiped(account, balance);
    }

    // Update transaction fee percentage
    function setTransactionFee(uint256 feePercentage) external {
        require(
            hasRole(TREASURY_ROLE, _msgSender()) ||
                hasRole(ADMIN_ROLE, _msgSender()) ||
                hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Not Authorize to call this function"
        );
        require(feePercentage <= 1000, "Fee cannot exceed 10%");
        transactionFeePercentage = feePercentage;
        emit FeePercentageUpdated(feePercentage);
    }

    // Update treasury wallet
    function setTreasuryWallet(address newWallet) external {
        require(
            hasRole(TREASURY_ROLE, _msgSender()) ||
                hasRole(ADMIN_ROLE, _msgSender()) ||
                hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Not Authorize to call this function"
        );
        require(newWallet != address(0), "Invalid treasury wallet");
        treasuryWallet = newWallet;
        emit TreasuryWalletUpdated(newWallet);
    }

    // Update transaction fee enabled
    function setTransactionFeeEnabled(bool enabled) external {
        require(
            hasRole(TREASURY_ROLE, _msgSender()) ||
                hasRole(ADMIN_ROLE, _msgSender()) ||
                hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Not Authorize to call this function"
        );
        transactionFeeEnabled = enabled;
        emit TransactionFeeUpdated(enabled);
    }

    // Pause and unpause functionality
    function pause() external {
        require(
            hasRole(PAUSER_ROLE, _msgSender()) ||
                hasRole(ADMIN_ROLE, _msgSender()) ||
                hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Not Authorize to call this function"
        );
        _pause();
    }

    function unpause() external {
        require(
            hasRole(PAUSER_ROLE, _msgSender()) ||
                hasRole(ADMIN_ROLE, _msgSender()) ||
                hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Not Authorize to call this function"
        );
        _unpause();
    }

    // ERC20 overrides to enforce pause, fee deduction, and freeze checks

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual whenNotPaused override {
        require(!_frozen[sender], "Sender account is frozen");
        require(!_frozen[recipient], "Recipient account is frozen");
        uint256 fee = 0;

        if (
            (transactionFeePercentage > 0) &&
            (transactionFeeEnabled) &&
            (!hasRole(WHITELIST_ROLE, _msgSender()))
        ) {
            fee = amount.mul(transactionFeePercentage).div(10000); // Calculate fee
            super._transfer(sender, treasuryWallet, fee); // Send fee to treasury
        }

        uint256 amountAfterFee = amount.sub(fee);
        super._transfer(sender, recipient, amountAfterFee);
    }

    // The following functions are overrides required by Solidity.

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        super._update(from, to, value);
    }
}

/* Mintable reserve
    remaining mintable
    mint reserve
    available to mint
    mint capacity
*/
//USDT
//USDC
//BUSD
//Binance
//Ethereum
