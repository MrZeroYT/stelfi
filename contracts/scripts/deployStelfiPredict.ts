import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

// Arc Testnet USDC address — set ARC_USDC_ADDRESS in contracts/.env
const ARC_TESTNET_USDC =
  process.env.ARC_USDC_ADDRESS ||
  "0x0000000000000000000000000000000000000000";

async function main() {
  console.log("\n🚀 Deploying StelfiPredict to Arc Testnet...\n");

  if (ARC_TESTNET_USDC === "0x0000000000000000000000000000000000000000") {
    console.warn("⚠️  WARNING: ARC_USDC_ADDRESS not set in .env");
    console.warn("   Add ARC_USDC_ADDRESS to contracts/.env before deploying");
    console.warn("   Get it from: https://testnet.arcscan.app");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("📍 Deployer address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", ethers.formatEther(balance), "ETH");
  console.log("🪙 USDC Address:", ARC_TESTNET_USDC);

  console.log("\n⏳ Deploying StelfiPredict...");
  const StelfiPredict = await ethers.getContractFactory("StelfiPredict");
  const stelfiPredict = await StelfiPredict.deploy(ARC_TESTNET_USDC);
  await stelfiPredict.waitForDeployment();

  const address = await stelfiPredict.getAddress();

  console.log("\n✅ StelfiPredict deployed successfully!");
  console.log("════════════════════════════════════════");
  console.log("📄 Contract Address:", address);
  console.log("🔍 View on ArcScan:", `https://testnet.arcscan.app/address/${address}`);
  console.log("════════════════════════════════════════");
  console.log("\n📋 Next steps:");
  console.log("1. Copy this address:", address);
  console.log("2. Paste into stelfi/.env.local as:");
  console.log("   NEXT_PUBLIC_PREDICT_CONTRACT=" + address);
  console.log("\n");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
