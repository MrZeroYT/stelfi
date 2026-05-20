import StelfiSwapABI from "./abis/StelfiSwap.json";
import StelfiPredictABI from "./abis/StelfiPredict.json";

export const STELFI_SWAP_ADDRESS =
  process.env.NEXT_PUBLIC_FX_CONTRACT as `0x${string}`;

export const STELFI_PREDICT_ADDRESS =
  process.env.NEXT_PUBLIC_PREDICT_CONTRACT as `0x${string}`;

// Arc Testnet USDC: 0x3600000000000000000000000000000000000000
export const ARC_USDC_ADDRESS =
  process.env.NEXT_PUBLIC_ARC_USDC as `0x${string}`;

// Token addresses on Arc Testnet.
// USDC is the well-known native token. Others need real Arc addresses
// once they are bridged/issued — replace the placeholders below.
export const TOKEN_ADDRESSES: Record<string, `0x${string}`> = {
  USDC: (process.env.NEXT_PUBLIC_ARC_USDC ||
    "0x3600000000000000000000000000000000000000") as `0x${string}`,
  // TODO: replace with real Arc Testnet addresses once available
  EURC: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", // Arc Testnet EURC per skill docs
  BRLA: "0x0000000000000000000000000000000000000001", // placeholder
  MXNB: "0x0000000000000000000000000000000000000002", // placeholder
  PHPC: "0x0000000000000000000000000000000000000003", // placeholder
  JPYC: "0x0000000000000000000000000000000000000004", // placeholder
  KRW1: "0x0000000000000000000000000000000000000005", // placeholder
};

export const STELFI_SWAP_ABI = StelfiSwapABI;
export const STELFI_PREDICT_ABI = StelfiPredictABI;

// Minimal ERC-20 ABI for approve() calls
export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
