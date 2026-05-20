import { expect } from "chai";
import { ethers } from "hardhat";
import { StelfiPredict, MockERC20 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("StelfiPredict", function () {
  let predict: StelfiPredict;
  let usdc: MockERC20;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  const ONE_USDC = 1_000_000n;
  const TEN_USDC = 10_000_000n;
  const PLATFORM_FEE_BPS = 200n;
  const BPS_DENOM = 10_000n;

  let closingTime: number;
  const QUESTION = "Will BTC hit $120k by July 2026?";

  beforeEach(async () => {
    [owner, alice, bob, other] = await ethers.getSigners();

    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    usdc = (await MockERC20Factory.deploy("USD Coin", "USDC", 6)) as MockERC20;

    const PredictFactory = await ethers.getContractFactory("StelfiPredict");
    predict = (await PredictFactory.deploy(await usdc.getAddress())) as StelfiPredict;

    // Closing time: 1 hour from now
    closingTime = (await time.latest()) + 3600;

    // Mint USDC for users
    await usdc.mint(alice.address, TEN_USDC);
    await usdc.mint(bob.address, TEN_USDC);
    await usdc.mint(other.address, TEN_USDC);
  });

  // ─── Deployment ───────────────────────────────────────────
  describe("Deployment", () => {
    it("sets deployer as owner", async () => {
      expect(await predict.owner()).to.equal(owner.address);
    });

    it("stores USDC address correctly", async () => {
      expect(await predict.usdc()).to.equal(await usdc.getAddress());
    });

    it("reverts with zero address USDC", async () => {
      const PredictFactory = await ethers.getContractFactory("StelfiPredict");
      await expect(
        PredictFactory.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid USDC address");
    });

    it("starts with zero market count", async () => {
      expect(await predict.getMarketCount()).to.equal(0n);
    });
  });

  // ─── Market creation ──────────────────────────────────────
  describe("createMarket()", () => {
    it("owner can create a market", async () => {
      await expect(predict.createMarket(QUESTION, closingTime))
        .to.emit(predict, "MarketCreated")
        .withArgs(1n, QUESTION, BigInt(closingTime));

      const market = await predict.getMarket(1n);
      expect(market.question).to.equal(QUESTION);
      expect(market.closingTime).to.equal(BigInt(closingTime));
      expect(market.status).to.equal(0n); // Open
      expect(market.yesPool).to.equal(0n);
      expect(market.noPool).to.equal(0n);
    });

    it("increments market count", async () => {
      await predict.createMarket(QUESTION, closingTime);
      await predict.createMarket("Another question?", closingTime);
      expect(await predict.getMarketCount()).to.equal(2n);
    });

    it("reverts if closing time is in the past", async () => {
      const pastTime = (await time.latest()) - 1;
      await expect(
        predict.createMarket(QUESTION, pastTime)
      ).to.be.revertedWith("Closing time must be in future");
    });

    it("reverts if question is empty", async () => {
      await expect(
        predict.createMarket("", closingTime)
      ).to.be.revertedWith("Question cannot be empty");
    });

    it("reverts when non-owner tries to create market", async () => {
      await expect(
        predict.connect(alice).createMarket(QUESTION, closingTime)
      ).to.be.revertedWithCustomError(predict, "OwnableUnauthorizedAccount");
    });
  });

  // ─── Placing bets ─────────────────────────────────────────
  describe("placeBet()", () => {
    beforeEach(async () => {
      await predict.createMarket(QUESTION, closingTime);
      const predictAddr = await predict.getAddress();
      await usdc.connect(alice).approve(predictAddr, TEN_USDC);
      await usdc.connect(bob).approve(predictAddr, TEN_USDC);
    });

    it("alice can bet YES", async () => {
      await expect(predict.connect(alice).placeBet(1n, true, ONE_USDC))
        .to.emit(predict, "BetPlaced")
        .withArgs(1n, alice.address, true, ONE_USDC);

      const market = await predict.getMarket(1n);
      expect(market.yesPool).to.equal(ONE_USDC);
      expect(market.noPool).to.equal(0n);

      const [yesAmt] = await predict.getUserBet(1n, alice.address);
      expect(yesAmt).to.equal(ONE_USDC);
    });

    it("bob can bet NO", async () => {
      await expect(predict.connect(bob).placeBet(1n, false, ONE_USDC))
        .to.emit(predict, "BetPlaced")
        .withArgs(1n, bob.address, false, ONE_USDC);

      const market = await predict.getMarket(1n);
      expect(market.noPool).to.equal(ONE_USDC);
    });

    it("accumulates bets from multiple users", async () => {
      await predict.connect(alice).placeBet(1n, true, ONE_USDC);
      await predict.connect(bob).placeBet(1n, false, TEN_USDC);

      const market = await predict.getMarket(1n);
      expect(market.yesPool).to.equal(ONE_USDC);
      expect(market.noPool).to.equal(TEN_USDC);
    });

    it("reverts with zero amount", async () => {
      await expect(
        predict.connect(alice).placeBet(1n, true, 0n)
      ).to.be.revertedWith("Amount must be positive");
    });

    it("reverts betting on non-existent market", async () => {
      await expect(
        predict.connect(alice).placeBet(999n, true, ONE_USDC)
      ).to.be.revertedWith("Market does not exist");
    });

    it("reverts betting after closing time", async () => {
      await time.increaseTo(closingTime + 1);
      await expect(
        predict.connect(alice).placeBet(1n, true, ONE_USDC)
      ).to.be.revertedWith("Betting period ended");
    });
  });

  // ─── Market resolution ────────────────────────────────────
  describe("resolveMarket()", () => {
    beforeEach(async () => {
      await predict.createMarket(QUESTION, closingTime);
      const predictAddr = await predict.getAddress();
      await usdc.connect(alice).approve(predictAddr, TEN_USDC);
      await usdc.connect(bob).approve(predictAddr, TEN_USDC);
      await predict.connect(alice).placeBet(1n, true, ONE_USDC);
      await predict.connect(bob).placeBet(1n, false, ONE_USDC);
      // Advance past closing
      await time.increaseTo(closingTime + 1);
    });

    it("owner can resolve market YES", async () => {
      await expect(predict.resolveMarket(1n, true))
        .to.emit(predict, "MarketResolved")
        .withArgs(1n, true, ONE_USDC, ONE_USDC);

      const market = await predict.getMarket(1n);
      expect(market.status).to.equal(2n); // Resolved
      expect(market.outcome).to.be.true;
    });

    it("owner can resolve market NO", async () => {
      await predict.resolveMarket(1n, false);
      const market = await predict.getMarket(1n);
      expect(market.outcome).to.be.false;
    });

    it("reverts resolving before closing time", async () => {
      // Create a fresh market that's still open
      const futureClose = (await time.latest()) + 7200;
      await predict.createMarket("Fresh market?", futureClose);
      await expect(
        predict.resolveMarket(2n, true)
      ).to.be.revertedWith("Market still open");
    });

    it("reverts double resolution", async () => {
      await predict.resolveMarket(1n, true);
      await expect(
        predict.resolveMarket(1n, true)
      ).to.be.revertedWith("Already resolved");
    });

    it("reverts when non-owner resolves", async () => {
      await expect(
        predict.connect(alice).resolveMarket(1n, true)
      ).to.be.revertedWithCustomError(predict, "OwnableUnauthorizedAccount");
    });
  });

  // ─── Claiming winnings ────────────────────────────────────
  describe("claimWinnings()", () => {
    // Scenario: alice bets YES 4 USDC, bob bets NO 1 USDC
    // YES wins → alice wins bob's NO pool proportionally
    const ALICE_BET = 4n * ONE_USDC;
    const BOB_BET = 1n * ONE_USDC;

    beforeEach(async () => {
      await predict.createMarket(QUESTION, closingTime);
      const predictAddr = await predict.getAddress();
      await usdc.connect(alice).approve(predictAddr, ALICE_BET);
      await usdc.connect(bob).approve(predictAddr, BOB_BET);
      await predict.connect(alice).placeBet(1n, true, ALICE_BET);
      await predict.connect(bob).placeBet(1n, false, BOB_BET);
      await time.increaseTo(closingTime + 1);
      // Resolve: YES wins
      await predict.resolveMarket(1n, true);
    });

    it("winner (alice) can claim correct payout", async () => {
      // losingShareRaw = (4 * 1) / 4 = 1 USDC
      // fee = 1 * 200 / 10000 = 0.02 USDC
      // losingShare = 1 - 0.02 = 0.98 USDC
      // totalPayout = 4 + 0.98 = 4.98 USDC
      const losingShareRaw = (ALICE_BET * BOB_BET) / ALICE_BET;
      const fee = (losingShareRaw * PLATFORM_FEE_BPS) / BPS_DENOM;
      const expectedPayout = ALICE_BET + losingShareRaw - fee;

      const aliceBefore = await usdc.balanceOf(alice.address);
      await expect(predict.connect(alice).claimWinnings(1n))
        .to.emit(predict, "WinningsClaimed")
        .withArgs(1n, alice.address, expectedPayout);

      const aliceAfter = await usdc.balanceOf(alice.address);
      expect(aliceAfter - aliceBefore).to.equal(expectedPayout);
    });

    it("loser (bob) cannot claim", async () => {
      await expect(
        predict.connect(bob).claimWinnings(1n)
      ).to.be.revertedWith("No winning stake");
    });

    it("winner cannot claim twice", async () => {
      await predict.connect(alice).claimWinnings(1n);
      await expect(
        predict.connect(alice).claimWinnings(1n)
      ).to.be.revertedWith("Already claimed");
    });

    it("reverts claiming from unresolved market", async () => {
      const futureClose = (await time.latest()) + 7200;
      await predict.createMarket("Open market?", futureClose);
      const predictAddr = await predict.getAddress();
      await usdc.connect(other).approve(predictAddr, ONE_USDC);
      await predict.connect(other).placeBet(2n, true, ONE_USDC);

      await expect(
        predict.connect(other).claimWinnings(2n)
      ).to.be.revertedWith("Market not resolved yet");
    });

    it("non-participant cannot claim", async () => {
      await expect(
        predict.connect(other).claimWinnings(1n)
      ).to.be.revertedWith("No winning stake");
    });
  });

  // ─── Fee withdrawal ───────────────────────────────────────
  describe("withdrawFees()", () => {
    it("owner can withdraw platform fees after claims", async () => {
      const predictAddr = await predict.getAddress();
      await predict.createMarket(QUESTION, closingTime);
      const aliceBet = 4n * ONE_USDC;
      const bobBet = ONE_USDC;
      await usdc.connect(alice).approve(predictAddr, aliceBet);
      await usdc.connect(bob).approve(predictAddr, bobBet);
      await predict.connect(alice).placeBet(1n, true, aliceBet);
      await predict.connect(bob).placeBet(1n, false, bobBet);
      await time.increaseTo(closingTime + 1);
      await predict.resolveMarket(1n, true);
      await predict.connect(alice).claimWinnings(1n);

      const fees = await predict.accumulatedFees();
      expect(fees).to.be.gt(0n);

      const ownerBefore = await usdc.balanceOf(owner.address);
      await expect(predict.withdrawFees()).to.emit(predict, "FeesWithdrawn");
      const ownerAfter = await usdc.balanceOf(owner.address);

      expect(ownerAfter - ownerBefore).to.equal(fees);
      expect(await predict.accumulatedFees()).to.equal(0n);
    });

    it("reverts if no fees accumulated", async () => {
      await expect(predict.withdrawFees()).to.be.revertedWith(
        "No fees to withdraw"
      );
    });
  });

  // ─── getPotentialPayout ───────────────────────────────────
  describe("getPotentialPayout()", () => {
    it("returns bet amount when opposing pool is empty", async () => {
      await predict.createMarket(QUESTION, closingTime);
      const payout = await predict.getPotentialPayout(1n, true, ONE_USDC);
      expect(payout).to.equal(ONE_USDC);
    });
  });
});
