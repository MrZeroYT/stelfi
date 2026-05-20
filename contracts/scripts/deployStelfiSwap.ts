import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("\n🚀 Deploying StelfiSwap to Arc Testnet...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📍 Deployer address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", ethers.formatEther(balance), "ETH");

  console.log("\n⏳ Deploying StelfiSwap...");
  const StelfiSwap = await ethers.getContractFactory("StelfiSwap");
  const stelfiSwap = await StelfiSwap.deploy();
  await stelfiSwap.waitForDeployment();

  const address = await stelfiSwap.getAddress();

  console.log("\n✅ StelfiSwap deployed successfully!");
  console.log("════════════════════════════════════════");
  console.log("📄 Contract Address:", address);
  console.log("🔍 View on ArcScan:", `https://testnet.arcscan.app/address/${address}`);
  console.log("════════════════════════════════════════");
  console.log("\n📋 Next steps:");
  console.log("1. Copy this address:", address);
  console.log("2. Paste into stelfi/.env.local as:");
  console.log("   NEXT_PUBLIC_FX_CONTRACT=" + address);
  console.log("\n");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
