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
  fadeUpVariants,
  scaleInVariants,
} from "@/lib/animations";
import { getAppKit, createBrowserAdapter, KIT_KEY, SwapChain } from "@/lib/appkit";

// ── Token config ──────────────────────────────────────────────
const TOKENS: Record<string, {
  symbol: string; name: string; decimals: number;
  color: string; icon: string;
  appKitId: string | null; supported: boolean;
}> = {
  USDC: { symbol: "USDC", name: "USD Coin",         decimals: 6, color: "#2775CA", icon: "$",  appKitId: "USDC", supported: true  },
  EURC: { symbol: "EURC", name: "Euro Coin",         decimals: 6, color: "#0052B4", icon: "€",  appKitId: "EURC", supported: true  },
  BRLA: { symbol: "BRLA", name: "Brazilian Real",    decimals: 6, color: "#009C3B", icon: "R$", appKitId: null,   supported: false },
  MXNB: { symbol: "MXNB", name: "Mexican Peso",      decimals: 6, color: "#006847", icon: "MX$",appKitId: null,   supported: false },
  PHPC: { symbol: "PHPC", name: "Philippine Peso",   decimals: 6, color: "#0038A8", icon: "₱",  appKitId: null,   supported: false },
  JPYC: { symbol: "JPYC", name: "Japanese Yen",      decimals: 6, color: "#BC002D", icon: "¥",  appKitId: null,   supported: false },
  KRW1: { symbol: "KRW1", name: "Korean Won",        decimals: 6, color: "#003478", icon: "₩",  appKitId: null,   supported: false },
};

const FROM_TOKENS = ["USDC", "EURC"];
const TO_TOKENS   = ["BRLA", "MXNB", "PHPC", "JPYC", "KRW1", "EURC", "USDC"];

const MOCK_RATES: Record<string, Record<string, number>> = {
  USDC: { EURC: 0.92,  BRLA: 5.87,  MXNB: 17.2,  PHPC: 58.4,  JPYC: 149.3,  KRW1: 1342.5, USDC: 1 },
  EURC: { USDC: 1.087, BRLA: 6.38,  MXNB: 18.7,  PHPC: 63.5,  JPYC: 162.3,  KRW1: 1459.8, EURC: 1 },
  BRLA: { USDC: 0.170, EURC: 0.157 },
  MXNB: { USDC: 0.058, EURC: 0.053 },
  PHPC: { USDC: 0.017, EURC: 0.016 },
  JPYC: { USDC: 0.0067,EURC: 0.0062 },
  KRW1: { USDC: 0.00074,EURC: 0.00068 },
};

type SwapPhase = "idle" | "approving" | "approved" | "swapping" | "success" | "error";

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
      {/* Colored dot indicator */}
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

function PhaseLabel({ phase }: { phase: SwapPhase }) {
  const labels: Record<SwapPhase, string> = {
    idle:      "Swap Now",
    approving: "Step 1/2: Approving…",
    approved:  "Preparing swap…",
    swapping:  "Step 2/2: Swapping…",
    success:   "Swap Now",
    error:     "↩ Try Again",
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

// ── Main component ────────────────────────────────────────────
export default function SwapPage() {
  const { isConnected, address } = useAccount();

  const [fromToken, setFromToken] = useState<string>("USDC");
  const [toToken,   setToToken]   = useState<string>("BRLA");
  const [fromAmount, setFromAmount] = useState<string>("");
  const [phase,      setPhase]      = useState<SwapPhase>("idle");
  const [errorMsg,   setErrorMsg]   = useState<string>("");
  const [swapTxHash,    setSwapTxHash]    = useState<`0x${string}` | undefined>();
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();

  // Derived config
  const fromTokenConfig = TOKENS[fromToken];
  const toTokenConfig   = TOKENS[toToken];
  const fromAddr = (TOKEN_ADDRESSES[fromToken] || "") as `0x${string}`;
  const toAddr   = (TOKEN_ADDRESSES[toToken]   || "") as `0x${string}`;
  const fromDecimals = fromTokenConfig.decimals;
  const amountIn = fromAmount ? parseUnits(fromAmount, fromDecimals) : BigInt(0);

  const bothSupported = fromTokenConfig.supported && toTokenConfig.supported;

  // ── Balances ─────────────────────────────────────────────────
  const { data: fromBalanceData, isLoading: fromBalLoading, refetch: refetchFrom } = useBalance({
    address,
    token: fromAddr || undefined,
    chainId: 5042002,
    query: {
      enabled: !!address && !!fromAddr && !fromAddr.includes("PLACEHOLDER"),
      refetchInterval: 15000,
    },
  });
  const { data: toBalanceData, refetch: refetchTo } = useBalance({
    address,
    token: toAddr || undefined,
    chainId: 5042002,
    query: {
      enabled: !!address && !!toAddr && !toAddr.includes("PLACEHOLDER"),
      refetchInterval: 15000,
    },
  });

  // ── Contract rate (existing StelfiSwap) ───────────────────────
  const { data: contractOut } = useReadContract({
    address: STELFI_SWAP_ADDRESS,
    abi: STELFI_SWAP_ABI,
    functionName: "getAmountOut",
    args: [fromAddr, toAddr, amountIn > BigInt(0) ? amountIn : BigInt(1_000_000)],
    query: { enabled: !!fromAddr && !!toAddr && !!STELFI_SWAP_ADDRESS && !bothSupported },
  });

  const contractAmountOut = contractOut ? (contractOut as [bigint, bigint])[0] : BigInt(0);
  const contractFee       = contractOut ? (contractOut as [bigint, bigint])[1] : BigInt(0);
  const usingLiveRate     = !bothSupported && contractAmountOut > BigInt(0);

  // ── Compute displayed output ──────────────────────────────────
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

  const rateDisplay = bothSupported
    ? `1 ${fromToken} ≈ ${MOCK_RATES[fromToken]?.[toToken] ?? "~"} ${toToken} (App Kit)`
    : usingLiveRate
    ? `1 ${fromToken} ≈ ${(parseFloat(toAmount || "0") / parseFloat(fromAmount || "1")).toFixed(4)} ${toToken}`
    : `1 ${fromToken} = ${MOCK_RATES[fromToken]?.[toToken] ?? "—"} ${toToken}`;

  // ── Write hooks ───────────────────────────────────────────────
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

  const executeContractSwap = useCallback(async () => {
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
      executeContractSwap();
    }
  }, [approveConfirmed, phase]);

  useEffect(() => {
    if (swapConfirmed && phase === "swapping") {
      setPhase("success");
      refetchFrom();
      refetchTo();
    }
  }, [swapConfirmed, phase, refetchFrom, refetchTo]);

  // ── App Kit swap (USDC ↔ EURC on Arc) ────────────────────────
  const handleAppKitSwap = async () => {
    if (!address || !fromAmount || parseFloat(fromAmount) <= 0) return;
    setPhase("approving");
    setErrorMsg("");

    try {
      if (bothSupported && KIT_KEY) {
        const adapter = await createBrowserAdapter();
        if (!adapter) throw new Error("No wallet connected");

        const kit = getAppKit();
        setPhase("swapping");

        const result = await kit.swap({
          from:     { adapter, chain: SwapChain.Arc_Testnet },
          tokenIn:  fromToken,
          tokenOut: toToken,
          amountIn: fromAmount,
        });

        // swap returns an object with transaction details
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hash = (result as any)?.transactionHash || (result as any)?.txHash;
        if (hash) setSwapTxHash(hash);
        setPhase("success");
        refetchFrom();
        refetchTo();
      } else {
        // Fallback: use StelfiSwap contract
        setApproveTxHash(undefined);
        setSwapTxHash(undefined);
        const hash = await writeApprove({
          address: fromAddr,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [STELFI_SWAP_ADDRESS, amountIn],
        });
        setApproveTxHash(hash);
      }
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      setPhase("error");
      setErrorMsg(err?.shortMessage || err?.message || "Swap failed. Please try again.");
    }
  };

  // ── Token switch ──────────────────────────────────────────────
  const handleSwitchTokens = useCallback(() => {
    const tempFrom      = fromToken;
    const tempTo        = toToken;
    const tempAmountOut = toAmount;

    if (FROM_TOKENS.includes(tempTo)) {
      setFromToken(tempTo);
      setToToken(tempFrom);
    } else {
      setToToken(tempFrom);
    }

    if (tempAmountOut && parseFloat(tempAmountOut) > 0) {
      setFromAmount(parseFloat(tempAmountOut).toFixed(6));
    } else {
      setFromAmount("");
    }

    setPhase("idle");
    setErrorMsg("");
    setSwapTxHash(undefined);
    setApproveTxHash(undefined);
  }, [fromToken, toToken, toAmount]);

  // ── MAX ───────────────────────────────────────────────────────
  function handleMax() {
    if (!fromBalanceData) return;
    const max    = fromBalanceData.value;
    const buffer = parseUnits("0.01", fromDecimals);
    const val    = max > buffer ? max - buffer : BigInt(0);
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

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pt-8 pb-16 px-4" style={{ position: "relative", zIndex: 1 }}>
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
            {/* Label + balance row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#8B9EC7", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                From
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {isConnected ? (
                  fromBalLoading ? <BalanceSkeleton /> : (
                    <span style={{ fontSize: "12px", color: "#8B9EC7" }}>
                      Balance:{" "}
                      <span style={{ color: fromBalanceData && fromBalanceData.value > BigInt(0) ? "#00D4AA" : "#8B9EC7" }}>
                        {formatBalance(fromBalanceData?.value, fromDecimals)} {fromToken}
                      </span>
                    </span>
                  )
                ) : (
                  <span style={{ fontSize: "12px", color: "#4A5568" }}>Balance: --</span>
                )}
                {isConnected && fromBalanceData && fromBalanceData.value > BigInt(0) && (
                  <button onClick={handleMax} disabled={isLoading} className="balance-badge" style={{ fontSize: "11px", padding: "2px 8px" }}>
                    MAX
                  </button>
                )}
              </div>
            </div>

            {/* Token + amount input row */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px",
              minHeight: "64px",
            }}>
              <TokenSelect
                value={fromToken}
                options={FROM_TOKENS}
                onChange={(v) => { setFromToken(v); setPhase("idle"); }}
                disabled={isLoading}
              />
              <input
                type="number"
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => { setFromAmount(e.target.value); setPhase("idle"); }}
                disabled={isLoading}
                min="0"
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  textAlign: "right",
                  fontSize: "24px",
                  fontWeight: 600,
                  color: "#ffffff",
                  padding: "0 4px",
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
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "1px solid rgba(0,212,170,0.3)",
                background: "rgba(0,212,170,0.1)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#00D4AA",
                fontSize: "18px",
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
                  <span style={{ color: toBalanceData && toBalanceData.value > BigInt(0) ? "#00D4AA" : "#8B9EC7" }}>
                    {formatBalance(toBalanceData?.value, toTokenConfig.decimals)} {toToken}
                  </span>
                </span>
              ) : (
                <span style={{ fontSize: "12px", color: "#4A5568" }}>Balance: --</span>
              )}
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px",
              minHeight: "64px",
            }}>
              <TokenSelect
                value={toToken}
                options={TO_TOKENS}
                onChange={(v) => { setToToken(v); setPhase("idle"); }}
                disabled={isLoading}
              />
              <input
                type="number"
                readOnly
                value={toAmount}
                placeholder="0.00"
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  textAlign: "right",
                  fontSize: "24px",
                  fontWeight: 600,
                  color: toAmount ? "#00D4AA" : "#4A5568",
                  padding: "0 4px",
                  cursor: "default",
                }}
              />
            </div>
          </div>

          {/* "Coming soon" banner for unsupported pairs */}
          <AnimatePresence>
            {!bothSupported && (
              <motion.div
                key="coming-soon"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="glass-card"
                style={{
                  padding: "10px 14px",
                  border: "1px solid rgba(255,181,71,0.3)",
                  background: "rgba(255,181,71,0.05)",
                  marginTop: "-4px",
                }}
              >
                <p style={{ color: "#FFB547", fontSize: 13, margin: 0 }}>
                  ⚡ {fromToken}/{toToken} swap via Arc App Kit coming soon. Rate shown is indicative.
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
                  style={{ backgroundColor: bothSupported ? "#00D4AA" : usingLiveRate ? "#00D4AA" : "#8B9EC7" }}
                />
                {bothSupported
                  ? <span style={{ color: "#00D4AA" }}>Live rate via Arc App Kit</span>
                  : usingLiveRate
                  ? <span style={{ color: "#00D4AA" }}>Live rate from contract</span>
                  : <span style={{ color: "#8B9EC7" }}>Indicative rate — pair coming soon</span>}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#8B9EC7" }}>Network</span>
              <span style={{ color: "#00D4AA" }}>Arc Testnet</span>
            </div>
          </motion.div>

          {/* Action button */}
          {isConnected ? (
            <motion.button
              onClick={phase === "error" ? reset : handleAppKitSwap}
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

        {/* TX status messages */}
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
    </div>
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
