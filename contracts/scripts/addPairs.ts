import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

// ─────────────────────────────────────────────────────────────
// addPairs.ts
// Configures USDC ↔ EURC trading pairs in StelfiSwap and seeds
// initial liquidity so the contract can fulfil swaps.
//
// Run:  cd stelfi/contracts
//       npx hardhat run scripts/addPairs.ts --network arcTestnet
// ─────────────────────────────────────────────────────────────

const LIQUIDITY_USDC = ethers.parseUnits("10", 6);  // 10 USDC  seed
const LIQUIDITY_EURC = ethers.parseUnits("10", 6);  // 10 EURC  seed

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

async function main() {
  const [owner] = await ethers.getSigners();

  const SWAP_CONTRACT = process.env.STELFI_SWAP_ADDRESS || "";
  const USDC          = process.env.ARC_USDC_ADDRESS    || "";
  const EURC          = process.env.ARC_EURC_ADDRESS    || "";

  // ── Validate env ─────────────────────────────────────────────
  if (!SWAP_CONTRACT || !USDC || !EURC) {
    console.error("❌ Missing env vars. Ensure contracts/.env has:");
    console.error("   STELFI_SWAP_ADDRESS=0x...");
    console.error("   ARC_USDC_ADDRESS=0x...");
    console.error("   ARC_EURC_ADDRESS=0x...");
    process.exit(1);
  }

  console.log("════════════════════════════════════════════════════");
  console.log("  StelfiSwap — Configure Pairs & Seed Liquidity");
  console.log("════════════════════════════════════════════════════");
  console.log("Owner wallet :", owner.address);
  console.log("StelfiSwap   :", SWAP_CONTRACT);
  console.log("USDC         :", USDC);
  console.log("EURC         :", EURC);
  console.log("");

  const swap = await ethers.getContractAt("StelfiSwap", SWAP_CONTRACT);
  const usdc = new ethers.Contract(USDC, ERC20_ABI, owner);
  const eurc = new ethers.Contract(EURC, ERC20_ABI, owner);

  // ── Current state ─────────────────────────────────────────────
  const [rateUD, activeUD] = await swap.getRate(USDC, EURC);
  const [rateEU, activeEU] = await swap.getRate(EURC, USDC);
  const contractUSDC = await usdc.balanceOf(SWAP_CONTRACT);
  const contractEURC = await eurc.balanceOf(SWAP_CONTRACT);
  const walletUSDC   = await usdc.balanceOf(owner.address);
  const walletEURC   = await eurc.balanceOf(owner.address);

  console.log("── Current contract state ──────────────────────────");
  console.log(`  USDC→EURC: rate=${rateUD} active=${activeUD}`);
  console.log(`  EURC→USDC: rate=${rateEU} active=${activeEU}`);
  console.log(`  Contract USDC liquidity: ${ethers.formatUnits(contractUSDC, 6)} USDC`);
  console.log(`  Contract EURC liquidity: ${ethers.formatUnits(contractEURC, 6)} EURC`);
  console.log(`  Wallet USDC balance   : ${ethers.formatUnits(walletUSDC, 6)} USDC`);
  console.log(`  Wallet EURC balance   : ${ethers.formatUnits(walletEURC, 6)} EURC`);
  console.log("");

  // ── Step 1: Add / update USDC → EURC pair ────────────────────
  // Rate: 0.92 EURC per USDC → 920_000 in 1e6 precision
  console.log("── Step 1/4: Configuring USDC → EURC pair (rate: 0.92) ─");
  const tx1 = await swap.addPair(USDC, EURC, 920_000n);
  await tx1.wait();
  console.log("✅ USDC→EURC added/updated:", tx1.hash);

  // ── Step 2: Add / update EURC → USDC pair ────────────────────
  // Rate: 1.087 USDC per EURC → 1_087_000 in 1e6 precision
  console.log("── Step 2/4: Configuring EURC → USDC pair (rate: 1.087) ─");
  const tx2 = await swap.addPair(EURC, USDC, 1_087_000n);
  await tx2.wait();
  console.log("✅ EURC→USDC added/updated:", tx2.hash);

  // ── Step 3: Seed USDC liquidity ───────────────────────────────
  // The contract needs to hold USDC so EURC→USDC swaps can settle.
  console.log(`\n── Step 3/4: Seeding ${ethers.formatUnits(LIQUIDITY_USDC, 6)} USDC liquidity ─`);
  if (walletUSDC < LIQUIDITY_USDC) {
    console.warn(`  ⚠️  Wallet only has ${ethers.formatUnits(walletUSDC, 6)} USDC — skipping USDC seed.`);
    console.warn(`     Fund your dev wallet at https://faucet.circle.com (select Arc Testnet).`);
  } else {
    const tx3 = await usdc.transfer(SWAP_CONTRACT, LIQUIDITY_USDC);
    await tx3.wait();
    console.log("✅ Sent 10 USDC to StelfiSwap:", tx3.hash);
  }

  // ── Step 4: Seed EURC liquidity ───────────────────────────────
  // The contract needs to hold EURC so USDC→EURC swaps can settle.
  console.log(`\n── Step 4/4: Seeding ${ethers.formatUnits(LIQUIDITY_EURC, 6)} EURC liquidity ─`);
  if (walletEURC < LIQUIDITY_EURC) {
    console.warn(`  ⚠️  Wallet only has ${ethers.formatUnits(walletEURC, 6)} EURC — skipping EURC seed.`);
    console.warn(`     EURC on Arc Testnet must be bridged via CCTP from another testnet chain.`);
    console.warn(`     Bridge at: https://faucet.circle.com  or use the Bridge page on Stelfi.`);
  } else {
    const tx4 = await eurc.transfer(SWAP_CONTRACT, LIQUIDITY_EURC);
    await tx4.wait();
    console.log("✅ Sent 10 EURC to StelfiSwap:", tx4.hash);
  }

  // ── Final state ───────────────────────────────────────────────
  const finalUSDC = await usdc.balanceOf(SWAP_CONTRACT);
  const finalEURC = await eurc.balanceOf(SWAP_CONTRACT);
  const [newRateUD, newActiveUD] = await swap.getRate(USDC, EURC);
  const [newRateEU, newActiveEU] = await swap.getRate(EURC, USDC);

  console.log("\n════════════════════════════════════════════════════");
  console.log("  Final state");
  console.log("════════════════════════════════════════════════════");
  console.log(`  USDC→EURC: rate=${newRateUD} (${Number(newRateUD)/1e6} per unit) active=${newActiveUD}`);
  console.log(`  EURC→USDC: rate=${newRateEU} (${Number(newRateEU)/1e6} per unit) active=${newActiveEU}`);
  console.log(`  Contract USDC: ${ethers.formatUnits(finalUSDC, 6)} USDC`);
  console.log(`  Contract EURC: ${ethers.formatUnits(finalEURC, 6)} EURC`);

  const canSwapUD = finalEURC > 0n;
  const canSwapEU = finalUSDC > 0n;
  console.log(`\n  USDC→EURC swap ready: ${canSwapUD ? "✅ YES" : "❌ NO — needs EURC liquidity"}`);
  console.log(`  EURC→USDC swap ready: ${canSwapEU ? "✅ YES" : "❌ NO — needs USDC liquidity"}`);

  console.log(`\n  View contract: https://testnet.arcscan.app/address/${SWAP_CONTRACT}`);
  console.log("════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("\n❌ Script failed:", err.shortMessage || err.message || err);
  process.exitCode = 1;
});
