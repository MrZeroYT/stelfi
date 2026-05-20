import { expect } from "chai";
import { ethers } from "hardhat";
import { StelfiSwap, MockERC20 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("StelfiSwap", function () {
  let swap: StelfiSwap;
  let usdc: MockERC20;
  let brla: MockERC20;
  let owner: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  // 1 USDC = 5.87 BRLA → rate = 5_870_000
  const RATE = 5_870_000n;
  const RATE_PRECISION = 1_000_000n;
  const FEE_BPS = 30n;
  const BPS_DENOM = 10_000n;

  // Token amounts (6 decimals for both mocks)
  const ONE_USDC = 1_000_000n;   // 1 USDC
  const TEN_USDC = 10_000_000n;  // 10 USDC
  const LIQUIDITY = 1_000_000_000n; // 1000 BRLA liquidity

  beforeEach(async () => {
    [owner, user, other] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    usdc = (await MockERC20Factory.deploy("USD Coin", "USDC", 6)) as MockERC20;
    brla = (await MockERC20Factory.deploy("BRL Agorá", "BRLA", 6)) as MockERC20;

    // Deploy StelfiSwap
    const SwapFactory = await ethers.getContractFactory("StelfiSwap");
    swap = (await SwapFactory.deploy()) as StelfiSwap;

    // Seed contract with BRLA liquidity
    await brla.mint(await swap.getAddress(), LIQUIDITY);
    // Give user USDC to swap
    await usdc.mint(user.address, TEN_USDC);
  });

  // ─── Deployment ───────────────────────────────────────────
  describe("Deployment", () => {
    it("sets deployer as owner", async () => {
      expect(await swap.owner()).to.equal(owner.address);
    });

    it("has correct fee constants", async () => {
      expect(await swap.FEE_BPS()).to.equal(30n);
      expect(await swap.BPS_DENOMINATOR()).to.equal(10_000n);
      expect(await swap.RATE_PRECISION()).to.equal(1_000_000n);
    });
  });

  // ─── Pair management ──────────────────────────────────────
  describe("Pair management", () => {
    it("owner can add a pair", async () => {
      await expect(
        swap.addPair(await usdc.getAddress(), await brla.getAddress(), RATE)
      )
        .to.emit(swap, "PairAdded")
        .withArgs(await usdc.getAddress(), await brla.getAddress(), RATE);

      const [rate, active] = await swap.getRate(
        await usdc.getAddress(),
        await brla.getAddress()
      );
      expect(rate).to.equal(RATE);
      expect(active).to.be.true;
    });

    it("reverts when non-owner tries to add pair", async () => {
      await expect(
        swap
          .connect(other)
          .addPair(await usdc.getAddress(), await brla.getAddress(), RATE)
      ).to.be.revertedWithCustomError(swap, "OwnableUnauthorizedAccount");
    });

    it("reverts adding pair with same tokens", async () => {
      await expect(
        swap.addPair(await usdc.getAddress(), await usdc.getAddress(), RATE)
      ).to.be.revertedWith("Tokens must differ");
    });

    it("reverts adding pair with zero rate", async () => {
      await expect(
        swap.addPair(await usdc.getAddress(), await brla.getAddress(), 0n)
      ).to.be.revertedWith("Rate must be positive");
    });

    it("owner can update rate", async () => {
      await swap.addPair(await usdc.getAddress(), await brla.getAddress(), RATE);
      const newRate = 6_000_000n;
      await expect(
        swap.updateRate(await usdc.getAddress(), await brla.getAddress(), newRate)
      )
        .to.emit(swap, "PairUpdated")
        .withArgs(await usdc.getAddress(), await brla.getAddress(), newRate);

      const [rate] = await swap.getRate(
        await usdc.getAddress(),
        await brla.getAddress()
      );
      expect(rate).to.equal(newRate);
    });

    it("owner can deactivate a pair", async () => {
      await swap.addPair(await usdc.getAddress(), await brla.getAddress(), RATE);
      await swap.deactivatePair(await usdc.getAddress(), await brla.getAddress());
      const [, active] = await swap.getRate(
        await usdc.getAddress(),
        await brla.getAddress()
      );
      expect(active).to.be.false;
    });
  });

  // ─── Token registration ───────────────────────────────────
  describe("Token registration", () => {
    it("owner can register a token", async () => {
      await expect(swap.registerToken(await usdc.getAddress(), "USDC"))
        .to.emit(swap, "TokenRegistered")
        .withArgs(await usdc.getAddress(), "USDC");

      const tokens = await swap.getSupportedTokens();
      expect(tokens).to.include(await usdc.getAddress());
    });
  });

  // ─── Swap ─────────────────────────────────────────────────
  describe("swap()", () => {
    beforeEach(async () => {
      await swap.addPair(await usdc.getAddress(), await brla.getAddress(), RATE);
      // Approve swap contract to spend user's USDC
      await usdc.connect(user).approve(await swap.getAddress(), TEN_USDC);
    });

    it("executes swap and emits Swapped event", async () => {
      const amountIn = ONE_USDC;
      const fee = (amountIn * FEE_BPS) / BPS_DENOM;
      const amountAfterFee = amountIn - fee;
      const expectedOut = (amountAfterFee * RATE) / RATE_PRECISION;

      await expect(
        swap
          .connect(user)
          .swap(await usdc.getAddress(), await brla.getAddress(), amountIn)
      )
        .to.emit(swap, "Swapped")
        .withArgs(
          user.address,
          await usdc.getAddress(),
          await brla.getAddress(),
          amountIn,
          expectedOut,
          fee
        );
    });

    it("calculates fee correctly (0.3%)", async () => {
      const amountIn = ONE_USDC;
      const expectedFee = (amountIn * FEE_BPS) / BPS_DENOM; // 3000 (0.3%)

      const userUsdcBefore = await usdc.balanceOf(user.address);
      await swap
        .connect(user)
        .swap(await usdc.getAddress(), await brla.getAddress(), amountIn);

      const userUsdcAfter = await usdc.balanceOf(user.address);
      expect(userUsdcBefore - userUsdcAfter).to.equal(amountIn);

      const accumulated = await swap.accumulatedFees(await usdc.getAddress());
      expect(accumulated).to.equal(expectedFee);
    });

    it("transfers correct BRLA to user", async () => {
      const amountIn = ONE_USDC;
      const fee = (amountIn * FEE_BPS) / BPS_DENOM;
      const expectedOut = ((amountIn - fee) * RATE) / RATE_PRECISION;

      await swap
        .connect(user)
        .swap(await usdc.getAddress(), await brla.getAddress(), amountIn);

      expect(await brla.balanceOf(user.address)).to.equal(expectedOut);
    });

    it("reverts if pair not active", async () => {
      await swap.deactivatePair(
        await usdc.getAddress(),
        await brla.getAddress()
      );
      await expect(
        swap
          .connect(user)
          .swap(await usdc.getAddress(), await brla.getAddress(), ONE_USDC)
      ).to.be.revertedWith("Pair not available");
    });

    it("reverts with zero amount", async () => {
      await expect(
        swap
          .connect(user)
          .swap(await usdc.getAddress(), await brla.getAddress(), 0n)
      ).to.be.revertedWith("Amount must be positive");
    });

    it("reverts if insufficient liquidity", async () => {
      // Drain contract BRLA
      const swapAddr = await swap.getAddress();
      const balance = await brla.balanceOf(swapAddr);
      // user would need enormous USDC to trigger liquidity exhaustion
      await usdc.mint(user.address, balance * 10n);
      await usdc.connect(user).approve(swapAddr, balance * 10n);

      await expect(
        swap
          .connect(user)
          .swap(await usdc.getAddress(), await brla.getAddress(), balance * 10n)
      ).to.be.revertedWith("Insufficient liquidity");
    });
  });

  // ─── getAmountOut ─────────────────────────────────────────
  describe("getAmountOut()", () => {
    beforeEach(async () => {
      await swap.addPair(await usdc.getAddress(), await brla.getAddress(), RATE);
    });

    it("returns correct amount and fee", async () => {
      const amountIn = ONE_USDC;
      const expectedFee = (amountIn * FEE_BPS) / BPS_DENOM;
      const expectedOut = ((amountIn - expectedFee) * RATE) / RATE_PRECISION;

      const [amountOut, fee] = await swap.getAmountOut(
        await usdc.getAddress(),
        await brla.getAddress(),
        amountIn
      );
      expect(amountOut).to.equal(expectedOut);
      expect(fee).to.equal(expectedFee);
    });

    it("reverts for inactive pair", async () => {
      await swap.deactivatePair(
        await usdc.getAddress(),
        await brla.getAddress()
      );
      await expect(
        swap.getAmountOut(
          await usdc.getAddress(),
          await brla.getAddress(),
          ONE_USDC
        )
      ).to.be.revertedWith("Pair not available");
    });
  });

  // ─── Fee withdrawal ───────────────────────────────────────
  describe("withdrawFees()", () => {
    it("owner can withdraw accumulated fees", async () => {
      await swap.addPair(await usdc.getAddress(), await brla.getAddress(), RATE);
      await usdc.connect(user).approve(await swap.getAddress(), TEN_USDC);
      await swap
        .connect(user)
        .swap(await usdc.getAddress(), await brla.getAddress(), ONE_USDC);

      const fees = await swap.accumulatedFees(await usdc.getAddress());
      expect(fees).to.be.gt(0n);

      const ownerBefore = await usdc.balanceOf(owner.address);
      await swap.withdrawFees(await usdc.getAddress());
      const ownerAfter = await usdc.balanceOf(owner.address);

      expect(ownerAfter - ownerBefore).to.equal(fees);
      expect(await swap.accumulatedFees(await usdc.getAddress())).to.equal(0n);
    });

    it("reverts if no fees to withdraw", async () => {
      await expect(
        swap.withdrawFees(await usdc.getAddress())
      ).to.be.revertedWith("No fees to withdraw");
    });
  });
});
