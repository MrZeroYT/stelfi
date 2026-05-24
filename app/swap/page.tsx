"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useAccount,
  useWriteContract,
  useReadContract,
  useBalance,
  usePublicClient,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseUnits, formatUnits, erc20Abi, type Address } from "viem";
import {
  STELFI_SWAP_ADDRESS,
  STELFI_SWAP_ABI,
} from "@/lib/contracts";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { KIT_KEY } from "@/lib/appkit"; // reserved — future App Kit rate enhancement
import {
  fadeUpVariants,
  scaleInVariants,
} from "@/lib/animations";

// ── Token config — address embedded for direct contract calls ──
// Arc Testnet addresses confirmed from use-arc skill + Circle docs.
// USDC: 6 decimals (ERC-20 mode — NOT native 18-decimal gas mode).
const TOKENS: Record<string, {
  symbol: string;
  name: string;
  decimals: number;
  color: string;
  icon: string;
  address: `0x${string}`;
}> = {
  USDC: {
    symbol: "USDC", name: "USD Coin",       decimals: 6,
    color: "#2775CA", icon: "$",
    address: "0x3600000000000000000000000000000000000000",
  },
  EURC: {
    symbol: "EURC", name: "Euro Coin",       decimals: 6,
    color: "#0052B4", icon: "€",
    address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
  },
  BRLA: {
    symbol: "BRLA", name: "Brazilian Real",  decimals: 6,
    color: "#009C3B", icon: "R$",
    address: "0x0000000000000000000000000000000000000001",
  },
  MXNB: {
    symbol: "MXNB", name: "Mexican Peso",    decimals: 6,
    color: "#006847", icon: "MX$",
    address: "0x0000000000000000000000000000000000000002",
  },
  PHPC: {
    symbol: "PHPC", name: "Philippine Peso", decimals: 6,
    color: "#0038A8", icon: "₱",
    address: "0x0000000000000000000000000000000000000003",
  },
  JPYC: {
    symbol: "JPYC", name: "Japanese Yen",    decimals: 6,
    color: "#BC002D", icon: "¥",
    address: "0x0000000000000000000000000000000000000004",
  },
  KRW1: {
    symbol: "KRW1", name: "Korean Won",      decimals: 6,
    color: "#003478", icon: "₩",
    address: "0x0000000000000000000000000000000000000005",
  },
};

// Placeholder addresses that mean "not deployed yet on Arc Testnet"
const PLACEHOLDER_ADDRS = new Set([
  "0x0000000000000000000000000000000000000001",
  "0x0000000000000000000000000000000000000002",
  "0x0000000000000000000000000000000000000003",
  "0x0000000000000000000000000000000000000004",
  "0x0000000000000000000000000000000000000005",
]);

const FROM_TOKENS = ["USDC", "EURC"];
const TO_TOKENS   = ["EURC", "USDC", "BRLA", "MXNB", "PHPC", "JPYC", "KRW1"];

// Indicative fallback rates shown when pair isn't configured in contract
const MOCK_RATES: Record<string, Record<string, number>> = {
  USDC: { EURC: 0.92, BRLA: 5.87, MXNB: 17.2, PHPC: 58.4, JPYC: 149.3, KRW1: 1342.5 },
  EURC: { USDC: 1.087, BRLA: 6.38, MXNB: 18.7, PHPC: 63.5, JPYC: 162.3, KRW1: 1459.8 },
};

type SwapPhase =
  | "idle"
  | "approving"
  | "waitApprove"
  | "swapping"
  | "waitSwap"
  | "success"
  | "error";

function formatBalance(balance: bigint | undefined, decimals: number): string {
  if (balance === undefined) return "--";
  const num = parseFloat(formatUnits(balance, decimals));
  if (num === 0) return "0.00";
  if (num < 0.01) return "< 0.01";
  if (num < 1000) return num.toFixed(2);
  if (num < 1_000_000) return (num / 1000).toFixed(2) + "K";
  return (num / 1_000_000).toFixed(2) + "M";
}

// ── Token selector dropdown ───────────────────────────────────
function TokenSelect({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const t = TOKENS[value];
  return (
    <div style={{ position: "relative", flexShrink: 0, width: "130px" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          width: "130px",
          padding: "8px 28px 8px 10px",
          fontSize: "15px",
          fontWeight: 700,
          color: "#ffffff",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "10px",
          outline: "none",
          cursor: "pointer",
        }}
      >
        {options.map((sym) => (
          <option key={sym} value={sym} style={{ background: "#0D1526" }}>
            {sym}
          </option>
        ))}
      </select>
      <div
        style={{
          position: "absolute",
          right: "10px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: t.color,
          boxShadow: `0 0 6px ${t.color}80`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function BalanceSkeleton() {
  return <div className="h-3 w-20 rounded shimmer" />;
}

// ── Main component ────────────────────────────────────────────
export default function SwapPage() {
  // ── Wallet + chain ──────────────────────────────────────────
  const { address, isConnected }  = useAccount();
  const chainId                   = useChainId();
  const { switchChainAsync }      = useSwitchChain();
  const publicClient              = usePublicClient({ chainId: 5042002 });
  const ARC_CHAIN_ID              = 5042002;

  // ── Hydration guard ─────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ── Core swap state ─────────────────────────────────────────
  const [fromToken, setFromToken] = useState<string>("USDC");
  const [toToken,   setToToken]   = useState<string>("EURC");
  const [amountIn,  setAmountIn]  = useState<string>("");
  const [amountOut, setAmountOut] = useState<string>("");
  const [swapPhase, setSwapPhase] = useState<SwapPhase>("idle");
  const [txHash,    setTxHash]    = useState<string>("");
  const [txError,   setTxError]   = useState<string | null>(null);

  // ── Wagmi write hooks ───────────────────────────────────────
  const { writeContractAsync: approveToken } = useWriteContract();
  const { writeContractAsync: executeSwap  } = useWriteContract();

  // ── Derived token config ────────────────────────────────────
  const fromConfig         = TOKENS[fromToken];
  const toConfig           = TOKENS[toToken];
  const fromTokenAddress   = fromConfig.address as Address;
  const toTokenAddress     = toConfig.address   as Address;
  const hasRealAddresses   =
    !PLACEHOLDER_ADDRS.has(fromTokenAddress) &&
    !PLACEHOLDER_ADDRS.has(toTokenAddress)   &&
    fromToken !== toToken;

  // ── Balances ─────────────────────────────────────────────────
  const {
    data: fromBalanceData,
    isLoading: fromBalLoading,
    refetch: refetchFromBalance,
  } = useBalance({
    address,
    token: fromTokenAddress,
    chainId: 5042002,
    query: {
      enabled: !!address && !PLACEHOLDER_ADDRS.has(fromTokenAddress),
      refetchInterval: 15000,
    },
  });

  const {
    data: toBalanceData,
    refetch: refetchToBalance,
  } = useBalance({
    address,
    token: toTokenAddress,
    chainId: 5042002,
    query: {
      enabled: !!address && !PLACEHOLDER_ADDRS.has(toTokenAddress),
      refetchInterval: 15000,
    },
  });

  // ── Read rate from StelfiSwap.getRate() ─────────────────────
  // Returns [rate (uint256), active (bool)]
  // rate precision = 1e6  (e.g. 920000 = 0.92 EURC per USDC)
  const { data: rateData } = useReadContract({
    address: STELFI_SWAP_ADDRESS,
    abi: STELFI_SWAP_ABI,
    functionName: "getRate",
    args: [fromTokenAddress, toTokenAddress],
    query: {
      enabled: hasRealAddresses && !!STELFI_SWAP_ADDRESS,
      refetchInterval: 30000,
    },
  });

  const contractRate = rateData ? (rateData as [bigint, boolean])[0] : undefined;
  const pairActive   = rateData ? (rateData as [bigint, boolean])[1] : false;

  // ── Derive output amount from contract rate ─────────────────
  // Mirrors StelfiSwap.getAmountOut() maths:
  //   fee       = amountIn * 30 / 10000   (0.3%)
  //   netIn     = amountIn - fee
  //   amountOut = netIn * rate / 1_000_000
  useEffect(() => {
    if (!amountIn || !contractRate || contractRate === 0n) {
      // Fallback: indicative mock rate when pair not in contract
      if (amountIn && parseFloat(amountIn) > 0) {
        const mockRate = MOCK_RATES[fromToken]?.[toToken];
        if (mockRate) {
          const fee = parseFloat(amountIn) * 0.003;
          setAmountOut(((parseFloat(amountIn) - fee) * mockRate).toFixed(4));
          return;
        }
      }
      setAmountOut("");
      return;
    }
    try {
      const amtParsed    = parseUnits(amountIn, 6);
      const fee          = amtParsed * 30n / 10000n;
      const amtAfterFee  = amtParsed - fee;
      const out          = amtAfterFee * contractRate / 1_000_000n;
      setAmountOut(formatUnits(out, 6));
    } catch {
      setAmountOut("");
    }
  }, [amountIn, contractRate, fromToken, toToken]);

  // ── Safety timeout: 2 min absolute escape hatch ─────────────
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loading = ["approving", "waitApprove", "swapping", "waitSwap"];
    if (loading.includes(swapPhase)) {
      t = setTimeout(() => {
        setSwapPhase("error");
        setTxError(
          "Timed out after 2 minutes. Check ArcScan at testnet.arcscan.app " +
          "to see if your transaction went through."
        );
      }, 120_000);
    }
    return () => clearTimeout(t);
  }, [swapPhase]);

  // ── Main swap handler ────────────────────────────────────────
  // Executes two MetaMask popups in sequence:
  //   #1 — ERC-20 approve(STELFI_SWAP_ADDRESS, amountIn)
  //   #2 — StelfiSwap.swap(fromAddr, toAddr, amountIn)
  const handleSwap = async () => {
    if (!address || !amountIn || parseFloat(amountIn) <= 0) return;

    setTxError(null);
    setTxHash("");

    // Arc Testnet chain guard
    if (chainId !== ARC_CHAIN_ID) {
      try {
        setSwapPhase("approving");
        await switchChainAsync({ chainId: ARC_CHAIN_ID });
      } catch {
        setSwapPhase("error");
        setTxError(
          "Please switch MetaMask to Arc Testnet (chain 5042002) and try again. " +
          "Add it at testnet.arcscan.app."
        );
        return;
      }
    }

    const fromAddr     = fromTokenAddress;
    const toAddr       = toTokenAddress;
    const amountParsed = parseUnits(amountIn, 6); // USDC always 6 decimals on Arc

    try {
      // ── STEP 1: APPROVE ───────────────────────────────────────
      // MetaMask popup #1 — user approves StelfiSwap to spend fromToken
      setSwapPhase("approving");
      console.log("[Stelfi] Step 1/2 — approve", {
        token:   fromAddr,
        spender: STELFI_SWAP_ADDRESS,
        amount:  amountParsed.toString(),
      });

      const approveTx = await approveToken({
        address:      fromAddr,
        abi:          erc20Abi,
        functionName: "approve",
        args:         [STELFI_SWAP_ADDRESS as Address, amountParsed],
        chainId:      ARC_CHAIN_ID,
      });

      console.log("[Stelfi] Approve tx sent:", approveTx);
      setSwapPhase("waitApprove");

      if (!publicClient) throw new Error(
        "No RPC connection to Arc Testnet — check your MetaMask network."
      );

      const approveReceipt = await publicClient.waitForTransactionReceipt({
        hash:    approveTx,
        timeout: 60_000,
      });

      console.log("[Stelfi] Approve confirmed:", approveReceipt.status);
      if (approveReceipt.status !== "success") {
        throw new Error("Approval transaction failed on-chain.");
      }

      // ── STEP 2: SWAP ──────────────────────────────────────────
      // MetaMask popup #2 — user confirms the actual swap
      setSwapPhase("swapping");
      console.log("[Stelfi] Step 2/2 — swap", {
        contract: STELFI_SWAP_ADDRESS,
        from:     fromAddr,
        to:       toAddr,
        amount:   amountParsed.toString(),
      });

      const swapTx = await executeSwap({
        address:      STELFI_SWAP_ADDRESS as Address,
        abi:          STELFI_SWAP_ABI,
        functionName: "swap",
        args:         [fromAddr, toAddr, amountParsed],
        chainId:      ARC_CHAIN_ID,
      });

      console.log("[Stelfi] Swap tx sent:", swapTx);
      setSwapPhase("waitSwap");

      const swapReceipt = await publicClient.waitForTransactionReceipt({
        hash:    swapTx,
        timeout: 60_000,
      });

      console.log("[Stelfi] Swap confirmed:", swapReceipt.status);
      if (swapReceipt.status !== "success") {
        throw new Error("Swap transaction reverted on-chain.");
      }

      // ── SUCCESS ───────────────────────────────────────────────
      setTxHash(swapTx);
      setSwapPhase("success");

      setTimeout(() => {
        refetchFromBalance();
        refetchToBalance();
        setAmountIn("");
        setAmountOut("");
      }, 2000);

      setTimeout(() => {
        setSwapPhase("idle");
        setTxHash("");
      }, 10000);

    } catch (err: unknown) {
      const e   = err as { code?: number; shortMessage?: string; message?: string };
      const msg = e?.shortMessage || e?.message || "";
      const code = e?.code;

      console.error("[Stelfi] Swap error:", err);

      if (code === 4001 ||
          msg.toLowerCase().includes("user rejected") ||
          msg.toLowerCase().includes("user denied")) {
        setTxError(
          "Transaction rejected. Please confirm in MetaMask to swap."
        );
      } else if (msg.includes("Insufficient liquidity")) {
        setTxError(
          `Not enough ${toToken} liquidity in the contract. ` +
          "The pool needs to be seeded — run addPairs.ts with a funded wallet."
        );
      } else if (
        msg.toLowerCase().includes("insufficient") ||
        msg.toLowerCase().includes("balance")
      ) {
        setTxError(
          "Insufficient balance. Make sure you have enough " +
          fromToken + " plus USDC for gas (Arc uses USDC as gas)."
        );
      } else if (
        msg.includes("Pair not available") ||
        msg.includes("pair not active")
      ) {
        setTxError(
          "This trading pair is not yet configured. " +
          "Run addPairs.ts on the contract to enable it."
        );
      } else if (msg.toLowerCase().includes("no rpc") || msg.toLowerCase().includes("timeout")) {
        setTxError("Network timeout — check your connection to Arc Testnet and try again.");
      } else {
        setTxError(msg || "Swap failed — see browser console for details.");
      }
      setSwapPhase("error");
    }
  };

  // ── Button label ────────────────────────────────────────────
  const getButtonLabel = (): string => {
    if (!mounted || !isConnected)     return "Connect Wallet to Swap";
    if (!amountIn || parseFloat(amountIn) <= 0) return "Enter an Amount";
    switch (swapPhase) {
      case "approving":   return "Step 1/2: Approve in Wallet…";
      case "waitApprove": return "Step 1/2: Confirming Approval…";
      case "swapping":    return "Step 2/2: Confirm Swap in Wallet…";
      case "waitSwap":    return "Step 2/2: Confirming Swap…";
      case "success":     return "✓ Swap Complete!";
      case "error":       return "↺ Try Again";
      default:            return `Swap ${fromToken} → ${toToken}`;
    }
  };

  // ── Token switch ────────────────────────────────────────────
  const handleSwitchTokens = useCallback(() => {
    if (FROM_TOKENS.includes(toToken)) {
      const oldFrom = fromToken;
      const oldTo   = toToken;
      setFromToken(oldTo);
      setToToken(oldFrom);
    } else {
      setToToken(fromToken);
    }
    if (amountOut && parseFloat(amountOut) > 0) {
      setAmountIn(parseFloat(amountOut).toFixed(6));
    } else {
      setAmountIn("");
    }
    setAmountOut("");
    setSwapPhase("idle");
    setTxError(null);
    setTxHash("");
  }, [fromToken, toToken, amountOut]);

  // ── MAX ──────────────────────────────────────────────────────
  function handleMax() {
    if (!fromBalanceData) return;
    const buffer = parseUnits("0.01", 6);
    const val = fromBalanceData.value > buffer
      ? fromBalanceData.value - buffer
      : BigInt(0);
    setAmountIn(formatUnits(val, 6));
  }

  function handleReset() {
    setSwapPhase("idle");
    setTxError(null);
    setAmountIn("");
    setAmountOut("");
    setTxHash("");
  }

  const isLoading = ["approving", "waitApprove", "swapping", "waitSwap"].includes(swapPhase);

  // ── Rate display helpers ────────────────────────────────────
  const displayFee = amountIn && parseFloat(amountIn) > 0
    ? (parseFloat(amountIn) * 0.003).toFixed(4)
    : "0";

  const rateLabel = pairActive && contractRate && contractRate > 0n
    ? `1 ${fromToken} ≈ ${(Number(contractRate) / 1_000_000).toFixed(4)} ${toToken} (live)`
    : `1 ${fromToken} ≈ ${MOCK_RATES[fromToken]?.[toToken] ?? "—"} ${toToken} (indicative)`;

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen pt-8 pb-16" style={{ position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: "440px", width: "100%", margin: "0 auto" }}>

        {/* Header */}
        <motion.div variants={fadeUpVariants} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-black text-white">Stelfi Swap</h1>
            <NetworkBadge />
          </div>
          <p className="text-sm" style={{ color: "#00D4AA" }}>
            Exchange stablecoins instantly on Arc Network
          </p>
        </motion.div>

        {/* Swap card */}
        <motion.div variants={scaleInVariants} className="glass-card flex flex-col gap-5" style={{ padding: "24px" }}>

          {/* FROM section */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#8B9EC7", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                From
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {isConnected ? (
                  fromBalLoading ? <BalanceSkeleton /> : (
                    <span style={{ fontSize: "12px", color: "#8B9EC7" }}>
                      Balance:{" "}
                      <span style={{ color: fromBalanceData && fromBalanceData.value > 0n ? "#00D4AA" : "#8B9EC7" }}>
                        {formatBalance(fromBalanceData?.value, 6)} {fromToken}
                      </span>
                    </span>
                  )
                ) : (
                  <span style={{ fontSize: "12px", color: "#4A5568" }}>Balance: --</span>
                )}
                {isConnected && fromBalanceData && fromBalanceData.value > 0n && (
                  <button
                    onClick={handleMax}
                    disabled={isLoading}
                    className="balance-badge"
                    style={{ fontSize: "11px", padding: "2px 8px" }}
                  >
                    MAX
                  </button>
                )}
              </div>
            </div>

            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "12px 14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px", minHeight: "64px",
            }}>
              <TokenSelect
                value={fromToken}
                options={FROM_TOKENS}
                onChange={(v) => { setFromToken(v); setSwapPhase("idle"); setTxError(null); }}
                disabled={isLoading}
              />
              <input
                type="number"
                placeholder="0.00"
                value={amountIn}
                onChange={(e) => { setAmountIn(e.target.value); setSwapPhase("idle"); }}
                disabled={isLoading}
                min="0"
                style={{
                  flex: 1, minWidth: 0,
                  background: "transparent", border: "none", outline: "none",
                  textAlign: "right", fontSize: "24px", fontWeight: 600,
                  color: "#ffffff", padding: "0 4px",
                }}
                className="placeholder:text-gray-700"
              />
            </div>
          </div>

          {/* Switch button */}
          <div className="flex justify-center" style={{ margin: "-4px 0" }}>
            <motion.button
              type="button"
              onClick={handleSwitchTokens}
              disabled={isLoading}
              whileHover={{ rotate: 180, scale: 1.1 }}
              whileTap={{ scale: 0.85 }}
              transition={{ duration: 0.35, ease: "backOut" }}
              style={{
                width: "40px", height: "40px", borderRadius: "50%",
                border: "1px solid rgba(0,212,170,0.3)",
                background: "rgba(0,212,170,0.1)",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", color: "#00D4AA", fontSize: "18px",
                opacity: isLoading ? 0.4 : 1,
              }}
            >
              ⇅
            </motion.button>
          </div>

          {/* TO section */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#8B9EC7", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                To
              </span>
              {isConnected ? (
                <span style={{ fontSize: "12px", color: "#8B9EC7" }}>
                  Balance:{" "}
                  <span style={{ color: toBalanceData && toBalanceData.value > 0n ? "#00D4AA" : "#8B9EC7" }}>
                    {formatBalance(toBalanceData?.value, 6)} {toToken}
                  </span>
                </span>
              ) : (
                <span style={{ fontSize: "12px", color: "#4A5568" }}>Balance: --</span>
              )}
            </div>

            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "12px 14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px", minHeight: "64px",
            }}>
              <TokenSelect
                value={toToken}
                options={TO_TOKENS}
                onChange={(v) => { setToToken(v); setSwapPhase("idle"); setTxError(null); }}
                disabled={isLoading}
              />
              <input
                type="number"
                readOnly
                value={amountOut}
                placeholder="0.00"
                style={{
                  flex: 1, minWidth: 0,
                  background: "transparent", border: "none", outline: "none",
                  textAlign: "right", fontSize: "24px", fontWeight: 600,
                  color: amountOut ? "#00D4AA" : "#4A5568", padding: "0 4px",
                  cursor: "default",
                }}
              />
            </div>
          </div>

          {/* Pair status indicator */}
          <AnimatePresence>
            {pairActive ? (
              <motion.div
                key="live"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "9px 14px", borderRadius: "10px",
                  background: "rgba(0,212,170,0.06)",
                  border: "1px solid rgba(0,212,170,0.2)",
                  marginTop: "-4px",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block"
                  style={{ flexShrink: 0 }}
                />
                <span style={{ color: "#00D4AA", fontSize: 12, fontWeight: 600 }}>
                  Live swap · StelfiSwap contract on Arc Testnet
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="indicative"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                style={{
                  padding: "9px 14px", borderRadius: "10px",
                  background: "rgba(255,181,71,0.05)",
                  border: "1px solid rgba(255,181,71,0.25)",
                  marginTop: "-4px",
                }}
              >
                <p style={{ color: "#FFB547", fontSize: 12, margin: 0 }}>
                  ⚡ Indicative rate — this pair is not yet active in the StelfiSwap contract.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rate info box */}
          <motion.div
            variants={fadeUpVariants}
            className="rounded-xl flex flex-col gap-2 text-xs"
            style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex justify-between">
              <span style={{ color: "#8B9EC7" }}>Rate</span>
              <span className="text-white">{rateLabel}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#8B9EC7" }}>Fee (0.3%)</span>
              <span className="text-white">{displayFee} {fromToken}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#8B9EC7" }}>Source</span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    display: "inline-block",
                    width: "6px", height: "6px",
                    borderRadius: "50%",
                    background: pairActive ? "#00D4AA" : "#8B9EC7",
                  }}
                />
                {pairActive ? (
                  <span style={{ color: "#00D4AA" }}>Live rate from contract</span>
                ) : (
                  <span style={{ color: "#8B9EC7" }}>Indicative rate (pair not configured)</span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#8B9EC7" }}>Network</span>
              <span style={{ color: "#00D4AA" }}>Arc Testnet</span>
            </div>
          </motion.div>

          {/* Action button */}
          {mounted && isConnected ? (
            <motion.button
              onClick={
                swapPhase === "error" || swapPhase === "success"
                  ? handleReset
                  : handleSwap
              }
              disabled={
                isLoading ||
                (!amountIn && swapPhase === "idle")
              }
              whileHover={!isLoading ? { scale: 1.02 } : {}}
              whileTap={!isLoading ? { scale: 0.98 } : {}}
              className="btn-primary w-full flex items-center justify-center gap-2"
              style={{
                height: "52px",
                background:
                  swapPhase === "error"
                    ? "rgba(255,77,109,0.12)"
                    : swapPhase === "success"
                    ? "rgba(0,212,170,0.12)"
                    : "linear-gradient(135deg, #00D4AA, #00B8A0)",
                color:
                  swapPhase === "error"  ? "#FF4D6D"
                  : swapPhase === "success" ? "#00D4AA"
                  : "#050A14",
                border:
                  swapPhase === "error"
                    ? "1px solid rgba(255,77,109,0.3)"
                    : swapPhase === "success"
                    ? "1px solid rgba(0,212,170,0.3)"
                    : "none",
              }}
            >
              {isLoading && (
                <span className="animate-spin" style={{ fontSize: "16px" }}>⟳</span>
              )}
              <AnimatePresence mode="wait">
                <motion.span
                  key={swapPhase}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  {getButtonLabel()}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          ) : (
            <div className="flex justify-center">
              <ConnectButton label="Connect Wallet to Swap" />
            </div>
          )}

          {/* ── Inline status messages ─────────────────────── */}
          <AnimatePresence mode="wait">
            {swapPhase === "approving" && (
              <StatusCard key="approving" color="teal">
                <StatusRow icon="🔐" title="Check MetaMask">
                  Approve {fromToken} spending — click <b>Confirm</b> in MetaMask.
                </StatusRow>
              </StatusCard>
            )}
            {swapPhase === "waitApprove" && (
              <StatusCard key="waitApprove" color="teal">
                <StatusRow icon="⏳" title="Approval confirmed!">
                  Waiting for confirmation on Arc Testnet (~3 sec)…
                </StatusRow>
              </StatusCard>
            )}
            {swapPhase === "swapping" && (
              <StatusCard key="swapping" color="teal">
                <StatusRow icon="⚡" title="Check MetaMask">
                  Confirm the swap transaction — click <b>Confirm</b> in MetaMask.
                  <div style={{ marginTop: "4px", fontSize: "11px", color: "#4A5568" }}>
                    Do not close this window. Arc Testnet settles in ~3 seconds.
                  </div>
                </StatusRow>
              </StatusCard>
            )}
            {swapPhase === "waitSwap" && (
              <StatusCard key="waitSwap" color="teal">
                <StatusRow icon="⏳" title="Swap submitted!">
                  Waiting for confirmation on Arc Testnet (~3 sec)…
                </StatusRow>
              </StatusCard>
            )}
            {swapPhase === "error" && txError && (
              <StatusCard key="error" color="red">
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <span style={{ flexShrink: 0 }}>❌</span>
                  <div>
                    <span style={{ color: "#FF4D6D", fontSize: "13px" }}>{txError}</span>
                    <div style={{ marginTop: "4px", fontSize: "11px", color: "#8B9EC7" }}>
                      Click &ldquo;↺ Try Again&rdquo; to retry.
                    </div>
                  </div>
                </div>
              </StatusCard>
            )}
          </AnimatePresence>
        </motion.div>

        {/* TX success card */}
        <AnimatePresence mode="wait">
          {swapPhase === "success" && txHash && (
            <motion.div
              key="success-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="glass-card mt-4 p-4 flex flex-col gap-2 text-sm"
              style={{ border: "1px solid rgba(0,212,170,0.3)", background: "rgba(0,212,170,0.06)" }}
            >
              <div className="flex items-center gap-2 font-semibold" style={{ color: "#00D4AA" }}>
                ✅ Swap Successful!
              </div>
              <p style={{ color: "#8B9EC7", margin: 0 }}>
                Tx: {txHash.slice(0, 10)}…{txHash.slice(-8)}{" "}
                <a
                  href={`https://testnet.arcscan.app/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: "#00D4AA" }}
                >
                  View on ArcScan →
                </a>
              </p>
              <button
                onClick={handleReset}
                className="text-xs underline text-left mt-1"
                style={{ color: "#8B9EC7" }}
              >
                Make another swap
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────
function StatusCard({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "teal" | "red";
}) {
  const teal = color === "teal";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      style={{
        marginTop: "10px",
        padding: "12px 16px",
        borderRadius: "10px",
        background: teal ? "rgba(0,212,170,0.06)" : "rgba(255,77,109,0.06)",
        border: teal ? "1px solid rgba(0,212,170,0.2)" : "1px solid rgba(255,77,109,0.25)",
        fontSize: "13px",
        color: "#8B9EC7",
      }}
    >
      {children}
    </motion.div>
  );
}

function StatusRow({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
        <span>{icon}</span>
        <span style={{ color: "#ffffff", fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ fontSize: "12px" }}>{children}</div>
    </>
  );
}

function NetworkBadge() {
  return (
    <span
      className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5"
      style={{
        backgroundColor: "rgba(0,212,170,0.1)",
        color: "#00D4AA",
        border: "1px solid rgba(0,212,170,0.3)",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
      Arc Testnet
    </span>
  );
}
