import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const network = await ethers.provider.getNetwork();

  console.log("\n🔍 Pre-deployment check");
  console.log("══════════════════════════════════");
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance));
  console.log("USDC Address:", process.env.ARC_USDC_ADDRESS);
  console.log("══════════════════════════════════");

  if (balance === BigInt(0)) {
    console.error("❌ Wallet has no funds!");
    console.log("→ Go to https://faucet.circle.com");
    console.log("→ Select Arc Testnet");
    console.log("→ Paste address:", deployer.address);
    console.log("→ Request testnet USDC");
    process.exit(1);
  }

  if (
    !process.env.ARC_USDC_ADDRESS ||
    process.env.ARC_USDC_ADDRESS === "0x0000000000000000000000000000000000000000"
  ) {
    console.error("❌ ARC_USDC_ADDRESS not set!");
    console.log("→ Go to https://testnet.arcscan.app");
    console.log("→ Search for USDC token address");
    console.log("→ Add to contracts/.env");
    process.exit(1);
  }

  console.log("\n✅ All checks passed — ready to deploy!");
}

main().catch(console.error);
