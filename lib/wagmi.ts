"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arcTestnet } from "./chain";

export const wagmiConfig = getDefaultConfig({
  appName: "Stelfi",
  projectId: "stelfi-arc-testnet",
  chains: [arcTestnet],
  ssr: true,
});
