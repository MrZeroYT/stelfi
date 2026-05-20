import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const predictAddress = process.env.STELFI_PREDICT_ADDRESS;
  const swapAddress = process.env.STELFI_SWAP_ADDRESS;
  const usdcAddress = process.env.ARC_USDC_ADDRESS;

  if (!predictAddress || !swapAddress || !usdcAddress) {
    console.error("❌ Missing contract addresses in .env");
    console.log("Add after deploying:");
    console.log("STELFI_PREDICT_ADDRESS=0x...");
    console.log("STELFI_SWAP_ADDRESS=0x...");
    process.exit(1);
  }

  const [owner] = await ethers.getSigners();
  console.log("\n🌱 Seeding Stelfi with initial data...");
  console.log("Owner:", owner.address);

  // ── StelfiPredict: create 3 markets ─────────────────────
  const StelfiPredict = await ethers.getContractAt("StelfiPredict", predictAddress);

  const now = Math.floor(Date.now() / 1000);
  const markets = [
    {
      question: "Will BTC be above $120k by July 1, 2026?",
      closingTime: now + 60 * 60 * 24 * 30,
    },
    {
      question: "Will ETH hit $5k before Arc Mainnet launch?",
      closingTime: now + 60 * 60 * 24 * 60,
    },
    {
      question: "Will the US Fed cut rates in June 2026?",
      closingTime: now + 60 * 60 * 24 * 15,
    },
  ];

  for (const market of markets) {
    console.log(`\n📊 Creating market: "${market.question}"`);
    const tx = await StelfiPredict.createMarket(market.question, market.closingTime);
    await tx.wait();
    console.log("✅ Created — tx:", tx.hash);
  }

  // ── StelfiSwap: register USDC and seed USDC/EURC pair ───
  const StelfiSwap = await ethers.getContractAt("StelfiSwap", swapAddress);

  console.log("\n🪙 Registering USDC token...");
  const regTx = await StelfiSwap.registerToken(usdcAddress, "USDC");
  await regTx.wait();
  console.log("✅ USDC registered");

  // Arc Testnet EURC address from Circle documentation
  const eurcAddress = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";
  console.log("\n🪙 Registering EURC token...");
  const regEurc = await StelfiSwap.registerToken(eurcAddress, "EURC");
  await regEurc.wait();
  console.log("✅ EURC registered");

  // Add USDC → EURC pair (1 USDC = 0.923 EURC → rate = 923000)
  console.log("\n🔗 Adding USDC→EURC pair (rate: 0.923)...");
  const pairTx = await StelfiSwap.addPair(usdcAddress, eurcAddress, 923000n);
  await pairTx.wait();
  console.log("✅ Pair added");

  // Add EURC → USDC pair (1 EURC = 1.083 USDC → rate = 1083000)
  console.log("\n🔗 Adding EURC→USDC pair (rate: 1.083)...");
  const pairTx2 = await StelfiSwap.addPair(eurcAddress, usdcAddress, 1083000n);
  await pairTx2.wait();
  console.log("✅ Pair added");

  console.log("\n✅ Seeding complete!");
  console.log("════════════════════════════════════════");
  console.log("Markets created: 3");
  console.log("Tokens registered: USDC, EURC");
  console.log("Pairs configured: USDC↔EURC");
  console.log("View on ArcScan:", "https://testnet.arcscan.app");
  console.log("════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exitCode = 1;
});
