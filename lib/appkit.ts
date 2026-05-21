"use client";

import { AppKit, BridgeChain, SwapChain } from "@circle-fin/app-kit";
import { createAdapterFromProvider } from "@circle-fin/adapter-viem-v2";

// ── Kit key ───────────────────────────────────────────────────
export const KIT_KEY = process.env.NEXT_PUBLIC_KIT_KEY || "";

// ── Re-export chain enums ─────────────────────────────────────
export { BridgeChain, SwapChain };

// ── Bridge source chains for UI ───────────────────────────────
export const BRIDGE_SOURCE_CHAINS = [
  {
    id: BridgeChain.Ethereum_Sepolia,
    name: "Ethereum Sepolia",
    color: "#627EEA",
    icon: "Ξ",
  },
  {
    id: BridgeChain.Base_Sepolia,
    name: "Base Sepolia",
    color: "#0052FF",
    icon: "⬡",
  },
  {
    id: BridgeChain.Arbitrum_Sepolia,
    name: "Arbitrum Sepolia",
    color: "#28A0F0",
    icon: "◆",
  },
] as const;

export type BridgeSourceChain = (typeof BRIDGE_SOURCE_CHAINS)[number];

// ── App Kit singleton ─────────────────────────────────────────
let _appKit: AppKit | null = null;

export function getAppKit(): AppKit {
  if (!_appKit) {
    _appKit = new AppKit();
  }
  return _appKit;
}

// ── Create browser wallet adapter ─────────────────────────────
export async function createBrowserAdapter() {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const provider = (window as any).ethereum;
  if (!provider) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapter = await createAdapterFromProvider({ provider } as any);
    return adapter;
  } catch {
    return null;
  }
}
