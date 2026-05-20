import * as dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config();

async function verifySetup() {
  console.log("\n🔍 Verifying Stelfi development environment...\n");

  // Check private key exists
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "" || privateKey.length < 60) {
    console.error("❌ PRIVATE_KEY is missing or invalid in contracts/.env");
    console.log("   → Open contracts/.env and paste your dev wallet private key");
    process.exit(1);
  }
  console.log("✅ Private key found");

  // Derive wallet address
  let wallet: ethers.Wallet;
  try {
    wallet = new ethers.Wallet(privateKey);
    console.log("✅ Wallet address:", wallet.address);
    console.log("   → This is your dev wallet on Arc Testnet");
    console.log("   → Make sure this matches your MetaMask dev account");
  } catch (e) {
    console.error("❌ Private key is invalid — check for typos or extra spaces");
    process.exit(1);
  }

  // Check RPC connection
  const rpcUrl = process.env.ARC_RPC_URL;
  if (!rpcUrl) {
    console.error("❌ ARC_RPC_URL is missing in contracts/.env");
    process.exit(1);
  }

  try {
    console.log("\n🌐 Connecting to Arc Testnet...");
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    console.log("✅ Connected to Arc Testnet");
    console.log("   Chain ID:", network.chainId.toString());

    const balance = await provider.getBalance(wallet.address);
    const balanceEth = ethers.formatEther(balance);
    console.log("   Wallet balance:", balanceEth, "ETH equivalent");

    if (balance === BigInt(0)) {
      console.log("\n⚠️  Balance is zero — make sure you:");
      console.log("   1. Copied your wallet ADDRESS from MetaMask");
      console.log("   2. Visited https://faucet.circle.com");
      console.log("   3. Selected Arc Testnet and requested USDC");
    } else {
      console.log("✅ Wallet has funds — ready to deploy!");
    }
  } catch (e) {
    console.error("❌ Could not connect to Arc Testnet RPC");
    console.log("   Check your internet connection and try again");
    process.exit(1);
  }

  console.log("\n================================================");
  console.log("🎉 Setup verified! You are ready for Session 1.");
  console.log("================================================\n");
}

verifySetup();
