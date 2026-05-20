// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title StelfiPredict
/// @notice Binary prediction market contract for Stelfi
/// @dev Users stake USDC on YES or NO outcomes

contract StelfiPredict is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    // Platform fee: 2% of winnings
    uint256 public constant PLATFORM_FEE_BPS = 200;
    uint256 public constant BPS_DENOMINATOR = 10000;

    uint256 public marketCount;
    uint256 public accumulatedFees;

    enum MarketStatus {
        Open,     // accepting bets
        Closed,   // past closing time, awaiting resolution
        Resolved  // outcome set, claims open
    }

    struct Market {
        uint256 id;
        string question;
        uint256 closingTime;
        MarketStatus status;
        bool outcome;      // true = YES won, false = NO won
        uint256 yesPool;   // total USDC staked on YES
        uint256 noPool;    // total USDC staked on NO
        uint256 totalFees; // fees collected from this market
    }

    // marketId => Market
    mapping(uint256 => Market) public markets;

    // marketId => userAddress => YES amount staked
    mapping(uint256 => mapping(address => uint256)) public yesBets;

    // marketId => userAddress => NO amount staked
    mapping(uint256 => mapping(address => uint256)) public noBets;

    // marketId => userAddress => has claimed
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    // ─── Events ───────────────────────────────────────────
    event MarketCreated(uint256 indexed marketId, string question, uint256 closingTime);
    event BetPlaced(uint256 indexed marketId, address indexed user, bool isYes, uint256 amount);
    event MarketResolved(uint256 indexed marketId, bool outcome, uint256 yesPool, uint256 noPool);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event FeesWithdrawn(uint256 amount);

    // ─── Constructor ──────────────────────────────────────
    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }

    // ─── Owner Functions ──────────────────────────────────

    /// @notice Create a new prediction market
    /// @param question The market question
    /// @param closingTime Unix timestamp when betting closes
    function createMarket(
        string calldata question,
        uint256 closingTime
    ) external onlyOwner returns (uint256 marketId) {
        require(closingTime > block.timestamp, "Closing time must be in future");
        require(bytes(question).length > 0, "Question cannot be empty");

        marketId = ++marketCount;

        markets[marketId] = Market({
            id: marketId,
            question: question,
            closingTime: closingTime,
            status: MarketStatus.Open,
            outcome: false,
            yesPool: 0,
            noPool: 0,
            totalFees: 0
        });

        emit MarketCreated(marketId, question, closingTime);
    }

    /// @notice Resolve a market with the final outcome
    /// @param marketId The market to resolve
    /// @param outcome true = YES won, false = NO won
    function resolveMarket(uint256 marketId, bool outcome) external onlyOwner {
        Market storage market = markets[marketId];
        require(market.id != 0, "Market does not exist");
        require(block.timestamp >= market.closingTime, "Market still open");
        require(market.status != MarketStatus.Resolved, "Already resolved");

        market.outcome = outcome;
        market.status = MarketStatus.Resolved;

        emit MarketResolved(marketId, outcome, market.yesPool, market.noPool);
    }

    /// @notice Withdraw accumulated platform fees
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        require(amount > 0, "No fees to withdraw");
        accumulatedFees = 0;
        usdc.safeTransfer(owner(), amount);
        emit FeesWithdrawn(amount);
    }

    // ─── Public Functions ─────────────────────────────────

    /// @notice Place a bet on a market
    /// @param marketId The market to bet on
    /// @param isYes true = bet YES, false = bet NO
    /// @param amount Amount of USDC to stake
    function placeBet(
        uint256 marketId,
        bool isYes,
        uint256 amount
    ) external nonReentrant {
        Market storage market = markets[marketId];
        require(market.id != 0, "Market does not exist");
        require(market.status == MarketStatus.Open, "Market not open");
        require(block.timestamp < market.closingTime, "Betting period ended");
        require(amount > 0, "Amount must be positive");

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        if (isYes) {
            yesBets[marketId][msg.sender] += amount;
            market.yesPool += amount;
        } else {
            noBets[marketId][msg.sender] += amount;
            market.noPool += amount;
        }

        emit BetPlaced(marketId, msg.sender, isYes, amount);
    }

    /// @notice Claim winnings from a resolved market
    /// @param marketId The resolved market to claim from
    function claimWinnings(uint256 marketId) external nonReentrant {
        Market storage market = markets[marketId];
        require(market.id != 0, "Market does not exist");
        require(market.status == MarketStatus.Resolved, "Market not resolved yet");
        require(!hasClaimed[marketId][msg.sender], "Already claimed");

        uint256 userStake;
        uint256 winningPool;
        uint256 losingPool;

        if (market.outcome) {
            // YES won
            userStake = yesBets[marketId][msg.sender];
            winningPool = market.yesPool;
            losingPool = market.noPool;
        } else {
            // NO won
            userStake = noBets[marketId][msg.sender];
            winningPool = market.noPool;
            losingPool = market.yesPool;
        }

        require(userStake > 0, "No winning stake");

        // Proportional share of losing pool
        uint256 losingShareRaw = (userStake * losingPool) / winningPool;
        uint256 fee = (losingShareRaw * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 losingShare = losingShareRaw - fee;

        accumulatedFees += fee;

        uint256 totalPayout = userStake + losingShare;

        hasClaimed[marketId][msg.sender] = true;
        usdc.safeTransfer(msg.sender, totalPayout);

        emit WinningsClaimed(marketId, msg.sender, totalPayout);
    }

    // ─── View Functions ───────────────────────────────────

    /// @notice Get full market details
    function getMarket(uint256 marketId) external view returns (Market memory) {
        require(markets[marketId].id != 0, "Market does not exist");
        return markets[marketId];
    }

    /// @notice Get all markets (paginated, inclusive)
    function getMarkets(
        uint256 from,
        uint256 to
    ) external view returns (Market[] memory) {
        require(from >= 1 && to <= marketCount, "Out of range");
        uint256 length = to - from + 1;
        Market[] memory result = new Market[](length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = markets[from + i];
        }
        return result;
    }

    /// @notice Get user bet for a market
    function getUserBet(
        uint256 marketId,
        address user
    ) external view returns (uint256 yesAmount, uint256 noAmount, bool claimed) {
        return (yesBets[marketId][user], noBets[marketId][user], hasClaimed[marketId][user]);
    }

    /// @notice Calculate potential payout for a bet
    function getPotentialPayout(
        uint256 marketId,
        bool isYes,
        uint256 betAmount
    ) external view returns (uint256 potentialPayout) {
        Market memory market = markets[marketId];
        require(market.id != 0, "Market does not exist");

        uint256 myPool = isYes ? market.yesPool + betAmount : market.noPool + betAmount;
        uint256 opposingPool = isYes ? market.noPool : market.yesPool;

        if (myPool == 0) return betAmount;

        uint256 losingShareRaw = (betAmount * opposingPool) / myPool;
        uint256 fee = (losingShareRaw * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 losingShare = losingShareRaw - fee;

        potentialPayout = betAmount + losingShare;
    }

    /// @notice Get total market count
    function getMarketCount() external view returns (uint256) {
        return marketCount;
    }
}
