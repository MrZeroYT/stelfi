// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title StelfiSwap
/// @notice Stablecoin swap contract for Stelfi on Arc Testnet
/// @dev Supports multiple stablecoin pairs with configurable rates

contract StelfiSwap is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Fee: 0.3% = 30 basis points
    uint256 public constant FEE_BPS = 30;
    uint256 public constant BPS_DENOMINATOR = 10000;

    // Rate precision: 1e6
    // Example: 1 USDC = 5.87 BRLA → rate = 5870000
    uint256 public constant RATE_PRECISION = 1e6;

    struct Pair {
        uint256 rate;   // rate * RATE_PRECISION
        bool active;    // is pair available
    }

    // fromToken => toToken => Pair
    mapping(address => mapping(address => Pair)) public pairs;

    // token => accumulated fees
    mapping(address => uint256) public accumulatedFees;

    // Supported tokens list for frontend
    address[] public supportedTokens;
    mapping(address => bool) public isSupported;
    mapping(address => string) public tokenSymbols;

    // ─── Events ───────────────────────────────────────────
    event Swapped(
        address indexed user,
        address indexed fromToken,
        address indexed toToken,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee
    );
    event PairAdded(address fromToken, address toToken, uint256 rate);
    event PairUpdated(address fromToken, address toToken, uint256 newRate);
    event PairDeactivated(address fromToken, address toToken);
    event FeesWithdrawn(address token, uint256 amount);
    event TokenRegistered(address token, string symbol);

    // ─── Constructor ──────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ─── Owner Functions ──────────────────────────────────

    /// @notice Register a token with its symbol
    function registerToken(
        address token,
        string calldata symbol
    ) external onlyOwner {
        require(token != address(0), "Invalid token address");
        if (!isSupported[token]) {
            supportedTokens.push(token);
            isSupported[token] = true;
        }
        tokenSymbols[token] = symbol;
        emit TokenRegistered(token, symbol);
    }

    /// @notice Add a new trading pair
    /// @param fromToken Token user sends
    /// @param toToken Token user receives
    /// @param rate Exchange rate * RATE_PRECISION
    function addPair(
        address fromToken,
        address toToken,
        uint256 rate
    ) external onlyOwner {
        require(fromToken != address(0), "Invalid fromToken");
        require(toToken != address(0), "Invalid toToken");
        require(fromToken != toToken, "Tokens must differ");
        require(rate > 0, "Rate must be positive");

        pairs[fromToken][toToken] = Pair({ rate: rate, active: true });
        emit PairAdded(fromToken, toToken, rate);
    }

    /// @notice Update exchange rate for existing pair
    function updateRate(
        address fromToken,
        address toToken,
        uint256 newRate
    ) external onlyOwner {
        require(pairs[fromToken][toToken].active, "Pair not active");
        require(newRate > 0, "Rate must be positive");
        pairs[fromToken][toToken].rate = newRate;
        emit PairUpdated(fromToken, toToken, newRate);
    }

    /// @notice Deactivate a trading pair
    function deactivatePair(
        address fromToken,
        address toToken
    ) external onlyOwner {
        pairs[fromToken][toToken].active = false;
        emit PairDeactivated(fromToken, toToken);
    }

    /// @notice Withdraw accumulated fees
    function withdrawFees(address token) external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees[token];
        require(amount > 0, "No fees to withdraw");
        accumulatedFees[token] = 0;
        IERC20(token).safeTransfer(owner(), amount);
        emit FeesWithdrawn(token, amount);
    }

    // ─── Public Functions ─────────────────────────────────

    /// @notice Swap fromToken for toToken
    /// @param fromToken Token address to send
    /// @param toToken Token address to receive
    /// @param amountIn Amount of fromToken to swap
    function swap(
        address fromToken,
        address toToken,
        uint256 amountIn
    ) external nonReentrant returns (uint256 amountOut) {
        require(amountIn > 0, "Amount must be positive");

        Pair memory pair = pairs[fromToken][toToken];
        require(pair.active, "Pair not available");

        // Calculate fee
        uint256 fee = (amountIn * FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountAfterFee = amountIn - fee;

        // Calculate output amount
        amountOut = (amountAfterFee * pair.rate) / RATE_PRECISION;
        require(amountOut > 0, "Output too small");

        // Check contract has enough toToken
        require(
            IERC20(toToken).balanceOf(address(this)) >= amountOut,
            "Insufficient liquidity"
        );

        // Transfer fromToken from user to contract
        IERC20(fromToken).safeTransferFrom(msg.sender, address(this), amountIn);

        // Accumulate fee
        accumulatedFees[fromToken] += fee;

        // Transfer toToken to user
        IERC20(toToken).safeTransfer(msg.sender, amountOut);

        emit Swapped(msg.sender, fromToken, toToken, amountIn, amountOut, fee);
    }

    // ─── View Functions ───────────────────────────────────

    /// @notice Get exchange rate for a pair
    function getRate(
        address fromToken,
        address toToken
    ) external view returns (uint256 rate, bool active) {
        Pair memory pair = pairs[fromToken][toToken];
        return (pair.rate, pair.active);
    }

    /// @notice Calculate output amount for a given input
    function getAmountOut(
        address fromToken,
        address toToken,
        uint256 amountIn
    ) external view returns (uint256 amountOut, uint256 fee) {
        Pair memory pair = pairs[fromToken][toToken];
        require(pair.active, "Pair not available");
        fee = (amountIn * FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountAfterFee = amountIn - fee;
        amountOut = (amountAfterFee * pair.rate) / RATE_PRECISION;
    }

    /// @notice Get all supported tokens
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }

    /// @notice Get contract token balance
    function getLiquidity(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}
