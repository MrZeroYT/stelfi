"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseUnits, formatUnits } from "viem";
import {
  STELFI_SWAP_ADDRESS,
  STELFI_SWAP_ABI,
  TOKEN_ADDRESSES,
  ERC20_ABI,
} from "@/lib/contracts";
import {
  pageVariants,
  fadeUpVariants,
  scaleInVariants,
} from "@/lib/animations";

// ── Token config ─────────────────────────────────────────────
const TOKENS: Record<string, { symbol: string; name: string; decimals: number; color: string; icon: string }> = {
  USDC: { symbol: "USDC", name: "USD Coin",         decimals: 6, color: "#2775CA", icon: "$"  },
  EURC: { symbol: "EURC", name: "Euro Coin",         decimals: 6, color: "#0052B4", icon: "€"  },
  BRLA: { symbol: "BRLA", name: "Brazilian Real",    decimals: 6, color: "#009C3B", icon: "R$" },
  MXNB: { symbol: "MXNB", name: "Mexican Peso",      decimals: 6, color: "#006847", icon: "$"  },
  PHPC: { symbol: "PHPC", name: "Philippine Peso",   decimals: 6, color: "#0038A8", icon: "₱"  },
  JPYC: { symbol: "JPYC", name: "Japanese Yen",      decimals: 6, color: "#BC002D", icon: "¥"  },
  KRW1: { symbol: "KRW1", name: "Korean Won",        decimals: 6, color: "#003478", icon: "₩"  },
};

const FROM_TOKENS = ["USDC", "EURC"];
const TO_TOKENS   = ["BRLA", "MXNB", "PHPC", "JPYC", "KRW1", "EURC", "USDC"];

const MOCK_RATES: Record<string, Record<string, number>> = {
  USDC: { BRLA: 5.87, MXNB: 17.2, PHPC: 58.4, JPYC: 149.3, KRW1: 1342.5, EURC: 0.92, USDC: 1 },
  EURC: { USDC: 1.087, BRLA: 6.38, MXNB: 18.7, PHPC: 63.5, JPYC: 162.3, KRW1: 1459.8, EURC: 1 },
};

type SwapPhase = "idle" | "approving" | "approved" | "swapping" | "success" | "error";

// ── Balance formatting ────────────────────────────────────────
function formatBalance(balance: bigint | undefined, decimals: number): string {
  if (balance === undefined) return "--";
  const formatted = formatUnits(balance, decimals);
  const num = parseFloat(formatted);
  if (num === 0) return "0.00";
  if (num < 0.01) return "< 0.01";
  if (num < 1000) return num.toFixed(2);
  if (num < 1_000_000) return (num / 1000).toFixed(2) + "K";
  return (num / 1_000_000).toFixed(2) + "M";
}

// ── Token selector ────────────────────────────────────────────
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
    <div className="relative" style={{ minWidth: "140px" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="appearance-none w-full rounded-xl text-base font-bold text-white outline-none cursor-pointer"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "10px 36px 10px 14px",
          minWidth: "140px",
          whiteSpace: "nowrap",
        }}
      >
        {options.map((sym) => (
          <option key={sym} value={sym} style={{ background: "#0D1526", padding: "12px 16px" }}>
            {TOKENS[sym].icon}  {sym} — {TOKENS[sym].name}
          </option>
        ))}
      </select>
      <div
        className="absolute right-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full pointer-events-none"
        style={{ background: t.color, boxShadow: `0 0 6px ${t.color}80` }}
      />
    </div>
  );
}

// ── Shimmer skeleton ──────────────────────────────────────────
function BalanceSkeleton() {
  return (
    <div className="h-3 w-20 rounded shimmer" />
  );
}

// ── Phase label ───────────────────────────────────────────────
function PhaseLabel({ phase }: { phase: SwapPhase }) {
  const labels: Record<SwapPhase, string> = {
    idle: "Swap Now",
    approving: "Step 1/2: Approving…",
    approved: "Preparing swap…",
    swapping: "Step 2/2: Swapping…",
    success: "Swap Now",
    error: "↩ Try Again",
  };
  return (
    <motion.span
      key={phase}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-2"
    >
      {(phase === "approving" || phase === "approved" || phase === "swapping") && (
        <span className="animate-spin inline-block">⟳</span>
      )}
      {labels[phase]}
    </motion.span>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function SwapPage() {
  const { isConnected, address } = useAccount();
  const [fromToken, setFromToken] = useState("USDC");
  const [toToken,   setToToken]   = useState("BRLA");
  const [fromAmount, setFromAmount] = useState("");
  const [phase, setPhase] = useState<SwapPhase>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [swapTxHash,    setSwapTxHash]    = useState<`0x${string}` | undefined>();
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();

  const fromAddr = TOKEN_ADDRESSES[fromToken] as `0x${string}`;
  const toAddr   = TOKEN_ADDRESSES[toToken]   as `0x${string}`;
  const fromDecimals = TOKENS[fromToken].decimals;
  const amountIn = fromAmount ? parseUnits(fromAmount, fromDecimals) : BigInt(0);

  // ── Balances ────────────────────────────────────────────────
  const { data: fromBalanceData, isLoading: fromBalLoading, refetch: refetchFrom } = useBalance({
    address,
    token: fromAddr,
    chainId: 5042002,
    query: { enabled: !!address && !!fromAddr, refetchInterval: 10000 },
  });
  const { data: toBalanceData, refetch: refetchTo } = useBalance({
    address,
    token: toAddr,
    chainId: 5042002,
    query: { enabled: !!address && !!toAddr, refetchInterval: 10000 },
  });

  // ── getAmountOut ────────────────────────────────────────────
  const { data: contractOut } = useReadContract({
    address: STELFI_SWAP_ADDRESS,
    abi: STELFI_SWAP_ABI,
    functionName: "getAmountOut",
    args: [fromAddr, toAddr, amountIn > BigInt(0) ? amountIn : BigInt(1000000)],
    query: { enabled: !!fromAddr && !!toAddr && !!STELFI_SWAP_ADDRESS },
  });

  const contractAmountOut = contractOut ? (contractOut as [bigint, bigint])[0] : BigInt(0);
  const contractFee       = contractOut ? (contractOut as [bigint, bigint])[1] : BigInt(0);
  const usingLiveRate     = contractAmountOut > BigInt(0);

  let toAmount   = "";
  let displayFee = "0";
  if (fromAmount && parseFloat(fromAmount) > 0) {
    if (usingLiveRate) {
      toAmount   = formatUnits(contractAmountOut, 6);
      displayFee = formatUnits(contractFee, 6);
    } else {
      const rate    = MOCK_RATES[fromToken]?.[toToken] ?? 1;
      const mockFee = parseFloat(fromAmount) * 0.003;
      toAmount   = ((parseFloat(fromAmount) - mockFee) * rate).toFixed(4);
      displayFee = mockFee.toFixed(4);
    }
  }

  const rateDisplay = usingLiveRate
    ? `1 ${fromToken} ≈ ${(parseFloat(toAmount || "0") / parseFloat(fromAmount || "1")).toFixed(4)} ${toToken}`
    : `1 ${fromToken} = ${MOCK_RATES[fromToken]?.[toToken] ?? "—"} ${toToken}`;

  // ── Write hooks ─────────────────────────────────────────────
  const { writeContractAsync: writeApprove } = useWriteContract();
  const { writeContractAsync: writeSwap }    = useWriteContract();

  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
    query: { enabled: !!approveTxHash },
  });
  const { isSuccess: swapConfirmed } = useWaitForTransactionReceipt({
    hash: swapTxHash,
    query: { enabled: !!swapTxHash },
  });

  const executeSwap = useCallback(async () => {
    try {
      const hash = await writeSwap({
        address: STELFI_SWAP_ADDRESS,
        abi: STELFI_SWAP_ABI,
        functionName: "swap",
        args: [fromAddr, toAddr, amountIn],
      });
      setSwapTxHash(hash);
      setPhase("swapping");
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      setPhase("error");
      setErrorMsg(err?.shortMessage || err?.message || "Swap failed");
    }
  }, [writeSwap, fromAddr, toAddr, amountIn]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (approveConfirmed && phase === "approving") {
      setPhase("approved");
      executeSwap();
    }
  }, [approveConfirmed, phase]);

  useEffect(() => {
    if (swapConfirmed && phase === "swapping") {
      setPhase("success");
      refetchFrom();
      refetchTo();
    }
  }, [swapConfirmed, phase, refetchFrom, refetchTo]);

  const handleSwapDirection = useCallback(() => {
    const currentFrom = fromToken;
    const currentTo   = toToken;
    const currentOut  = toAmount;

    // Only swap if both tokens can be FROM tokens, otherwise just flip what we can
    if (FROM_TOKENS.includes(currentTo)) {
      setFromToken(currentTo);
      setToToken(currentFrom);
    } else {
      // toToken isn't a valid FROM — keep fromToken, just reset toToken
      setToToken(currentFrom);
    }
    // Carry computed output into the new input if it was a valid number
    if (currentOut && parseFloat(currentOut) > 0) {
      setFromAmount(parseFloat(currentOut).toFixed(6));
    } else {
      setFromAmount("");
    }
    setPhase("idle");
    setSwapTxHash(undefined);
    setApproveTxHash(undefined);
  }, [fromToken, toToken, toAmount]);

  async function handleSwapClick() {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return;
    setPhase("approving");
    setErrorMsg("");
    setApproveTxHash(undefined);
    setSwapTxHash(undefined);
    try {
      const hash = await writeApprove({
        address: fromAddr,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [STELFI_SWAP_ADDRESS, amountIn],
      });
      setApproveTxHash(hash);
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      setPhase("error");
      setErrorMsg(err?.shortMessage || err?.message || "Approval failed");
    }
  }

  function handleMax() {
    if (!fromBalanceData) return;
    const max = fromBalanceData.value;
    const buffer = parseUnits("0.01", fromDecimals);
    const val = max > buffer ? max - buffer : BigInt(0);
    setFromAmount(formatUnits(val, fromDecimals));
  }

  function reset() {
    setPhase("idle");
    setErrorMsg("");
    setFromAmount("");
    setApproveTxHash(undefined);
    setSwapTxHash(undefined);
  }

  const isLoading = phase === "approving" || phase === "approved" || phase === "swapping";

  // ── Render ───────────────────────────────────────────────────
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen pt-28 pb-16 px-4"
      style={{ position: "relative", zIndex: 1 }}
    >
      <div className="max-w-lg mx-auto">
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
        <motion.div variants={scaleInVariants} className="glass-card p-6 flex flex-col gap-5">

          {/* FROM */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#8B9EC7" }}>From</label>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  fromBalLoading ? <BalanceSkeleton /> : (
                    <span className="text-xs" style={{ color: "#8B9EC7" }}>
                      Balance:{" "}
                      <span style={{ color: fromBalanceData && fromBalanceData.value > BigInt(0) ? "#00D4AA" : "#8B9EC7" }}>
                        {formatBalance(fromBalanceData?.value, fromDecimals)} {fromToken}
                      </span>
                    </span>
                  )
                ) : (
                  <span className="text-xs" style={{ color: "#4A5568" }}>Balance: --</span>
                )}
                {isConnected && fromBalanceData && fromBalanceData.value > BigInt(0) && (
                  <button onClick={handleMax} className="balance-badge text-xs px-2 py-0.5" disabled={isLoading}>
                    MAX
                  </button>
                )}
              </div>
            </div>
            <div
              className="flex gap-3 rounded-xl p-4 items-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", minHeight: "80px" }}
            >
              <div style={{ minWidth: "140px" }}>
                <TokenSelect
                  value={fromToken}
                  options={FROM_TOKENS}
                  onChange={(v) => { setFromToken(v); setPhase("idle"); }}
                  disabled={isLoading}
                />
              </div>
              <input
                type="number"
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => { setFromAmount(e.target.value); setPhase("idle"); }}
                disabled={isLoading}
                className="flex-1 bg-transparent text-right text-2xl font-bold text-white outline-none placeholder:text-gray-700"
                min="0"
              />
            </div>
          </div>

          {/* Swap direction button */}
          <div className="flex justify-center -my-1">
            <motion.button
              onClick={handleSwapDirection}
              disabled={isLoading}
              whileHover={{ rotate: 180, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.4, ease: "backOut" }}
              className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40"
              style={{
                background: "rgba(0,212,170,0.1)",
                border: "1px solid rgba(0,212,170,0.3)",
                color: "#00D4AA",
              }}
            >
              ⇅
            </motion.button>
          </div>

          {/* TO */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#8B9EC7" }}>To</label>
              {isConnected ? (
                <span className="text-xs" style={{ color: "#8B9EC7" }}>
                  Balance:{" "}
                  <span style={{ color: toBalanceData && toBalanceData.value > BigInt(0) ? "#00D4AA" : "#8B9EC7" }}>
                    {formatBalance(toBalanceData?.value, TOKENS[toToken].decimals)} {toToken}
                  </span>
                </span>
              ) : (
                <span className="text-xs" style={{ color: "#4A5568" }}>Balance: --</span>
              )}
            </div>
            <div
              className="flex gap-3 rounded-xl p-4 items-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", minHeight: "80px" }}
            >
              <div style={{ minWidth: "140px" }}>
                <TokenSelect
                  value={toToken}
                  options={TO_TOKENS}
                  onChange={(v) => { setToToken(v); setPhase("idle"); }}
                  disabled={isLoading}
                />
              </div>
              <input
                type="number"
                readOnly
                value={toAmount}
                placeholder="0.00"
                className="flex-1 bg-transparent text-right text-2xl font-bold outline-none cursor-default"
                style={{ color: toAmount ? "#00D4AA" : "#4A5568" }}
              />
            </div>
          </div>

          {/* Rate info */}
          <motion.div
            variants={fadeUpVariants}
            className="rounded-xl p-4 flex flex-col gap-2 text-xs"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex justify-between">
              <span style={{ color: "#8B9EC7" }}>Rate</span>
              <span className="text-white">{rateDisplay}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#8B9EC7" }}>Fee (0.3%)</span>
              <span className="text-white">{displayFee} {fromToken}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#8B9EC7" }}>Source</span>
              <span className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ backgroundColor: usingLiveRate ? "#00D4AA" : "#8B9EC7" }}
                />
                {usingLiveRate
                  ? <span style={{ color: "#00D4AA" }}>Live rate from contract</span>
                  : <span style={{ color: "#8B9EC7" }}>Mock rate (pair not configured)</span>}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#8B9EC7" }}>Network</span>
              <span style={{ color: "#00D4AA" }}>Arc Testnet</span>
            </div>
          </motion.div>

          {/* Swap button */}
          {isConnected ? (
            <motion.button
              onClick={phase === "error" ? reset : handleSwapClick}
              disabled={isLoading || (!fromAmount && phase !== "error")}
              whileHover={!isLoading ? { scale: 1.02 } : {}}
              whileTap={!isLoading ? { scale: 0.98 } : {}}
              className="btn-primary w-full flex items-center justify-center"
              style={{
                height: "52px",
                background: phase === "error"
                  ? "rgba(255,255,255,0.06)"
                  : "linear-gradient(135deg, #00D4AA, #00B8A0)",
                color: phase === "error" ? "#8B9EC7" : "#050A14",
              }}
            >
              <AnimatePresence mode="wait">
                <PhaseLabel phase={phase} />
              </AnimatePresence>
            </motion.button>
          ) : (
            <div className="flex justify-center">
              <ConnectButton label="Connect Wallet to Swap" />
            </div>
          )}
        </motion.div>

        {/* Status messages */}
        <AnimatePresence mode="wait">
          {phase === "success" && swapTxHash && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="glass-card mt-4 p-4 flex flex-col gap-2 text-sm"
              style={{ border: "1px solid rgba(0,212,170,0.3)", background: "rgba(0,212,170,0.06)" }}
            >
              <div className="flex items-center gap-2 font-semibold" style={{ color: "#00D4AA" }}>
                <span>✓</span> Swap successful!
              </div>
              <p style={{ color: "#8B9EC7" }}>
                Tx: {swapTxHash.slice(0, 10)}…{swapTxHash.slice(-8)}{" "}
                <a
                  href={`https://testnet.arcscan.app/tx/${swapTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: "#00D4AA" }}
                >
                  View on ArcScan →
                </a>
              </p>
              <button onClick={reset} className="text-xs underline text-left mt-1" style={{ color: "#8B9EC7" }}>
                Make another swap
              </button>
            </motion.div>
          )}

          {phase === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="glass-card mt-4 p-4 text-sm"
              style={{ border: "1px solid rgba(255,77,109,0.3)", background: "rgba(255,77,109,0.06)", color: "#FF4D6D" }}
            >
              <span>✕</span> {errorMsg || "Transaction failed."}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function NetworkBadge() {
  return (
    <span
      className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5"
      style={{ backgroundColor: "rgba(0,212,170,0.1)", color: "#00D4AA", border: "1px solid rgba(0,212,170,0.3)" }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
      Arc Testnet
    </span>
  );
}
