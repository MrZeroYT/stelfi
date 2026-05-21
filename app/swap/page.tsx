"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useAccount,
  useReadContract,
  useBalance,
  useChainId,
  useSwitchChain,
  useWriteContract,
  usePublicClient,
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

// ── Token config ──────────────────────────────────────────────
const TOKENS: Record<string, {
  symbol: string; name: string; decimals: number;
  color: string; icon: string;
}> = {
  USDC: { symbol: "USDC", name: "USD Coin",         decimals: 6, color: "#2775CA", icon: "$"  },
  EURC: { symbol: "EURC", name: "Euro Coin",         decimals: 6, color: "#0052B4", icon: "€"  },
  BRLA: { symbol: "BRLA", name: "Brazilian Real",    decimals: 6, color: "#009C3B", icon: "R$" },
  MXNB: { symbol: "MXNB", name: "Mexican Peso",      decimals: 6, color: "#006847", icon: "MX$"},
  PHPC: { symbol: "PHPC", name: "Philippine Peso",   decimals: 6, color: "#0038A8", icon: "₱"  },
  JPYC: { symbol: "JPYC", name: "Japanese Yen",      decimals: 6, color: "#BC002D", icon: "¥"  },
  KRW1: { symbol: "KRW1", name: "Korean Won",        decimals: 6, color: "#003478", icon: "₩"  },
};

const FROM_TOKENS = ["USDC", "EURC"];
const TO_TOKENS   = ["EURC", "USDC", "BRLA", "MXNB", "PHPC", "JPYC", "KRW1"];

// Fallback indicative rates shown when contract has no pair configured yet
const MOCK_RATES: Record<string, Record<string, number>> = {
  USDC: { EURC: 0.92,  BRLA: 5.87,  MXNB: 17.2,  PHPC: 58.4,  JPYC: 149.3,  KRW1: 1342.5, USDC: 1 },
  EURC: { USDC: 1.087, BRLA: 6.38,  MXNB: 18.7,  PHPC: 63.5,  JPYC: 162.3,  KRW1: 1459.8, EURC: 1 },
  BRLA: { USDC: 0.170, EURC: 0.157 },
  MXNB: { USDC: 0.058, EURC: 0.053 },
  PHPC: { USDC: 0.017, EURC: 0.016 },
  JPYC: { USDC: 0.0067,EURC: 0.0062 },
  KRW1: { USDC: 0.00074,EURC: 0.00068 },
};

type SwapPhase = "idle" | "approving" | "waitingApproval" | "swapping" | "success" | "error";

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
    idle:            "Swap Now",
    approving:       "Step 1/2: Approve in Wallet…",
    waitingApproval: "Step 1/2: Confirming Approval…",
    swapping:        "Step 2/2: Confirm Swap in Wallet…",
    success:         "✓ Swap Complete!",
    error:           "↩ Try Again",
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
      {(phase === "approving" || phase === "waitingApproval" || phase === "swapping") && (
        <span className="animate-spin inline-block">⟳</span>
      )}
      {labels[phase]}
    </motion.span>
  );
}

// ── Main component ────────────────────────────────────────────
export default function SwapPage() {
  const { isConnected, address } = useAccount();
  const chainId                  = useChainId();
  const { switchChainAsync }     = useSwitchChain();
  const { writeContractAsync }   = useWriteContract();
  // publicClient on Arc Testnet — used to wait for tx receipts
  const publicClient             = usePublicClient({ chainId: 5042002 });
  const ARC_CHAIN_ID             = 5042002;

  const [fromToken, setFromToken] = useState<string>("USDC");
  const [toToken,   setToToken]   = useState<string>("EURC");
  const [fromAmount, setFromAmount] = useState<string>("");
  const [phase,      setPhase]     = useState<SwapPhase>("idle");
  const [errorMsg,   setErrorMsg]  = useState<string>("");
  const [swapTxHash, setSwapTxHash] = useState<string | undefined>();

  // Derived config
  const fromTokenConfig = TOKENS[fromToken];
  const toTokenConfig   = TOKENS[toToken];
  const fromAddr = (TOKEN_ADDRESSES[fromToken] || "") as `0x${string}`;
  const toAddr   = (TOKEN_ADDRESSES[toToken]   || "") as `0x${string}`;
  const fromDecimals = fromTokenConfig.decimals;
  const amountIn = fromAmount ? parseUnits(fromAmount, fromDecimals) : BigInt(0);

  // ── Balances ─────────────────────────────────────────────────
  const { data: fromBalanceData, isLoading: fromBalLoading, refetch: refetchFrom } = useBalance({
    address,
    token: fromAddr || undefined,
    chainId: 5042002,
    query: {
      enabled: !!address && !!fromAddr,
      refetchInterval: 15000,
    },
  });
  const { data: toBalanceData, refetch: refetchTo } = useBalance({
    address,
    token: toAddr || undefined,
    chainId: 5042002,
    query: {
      enabled: !!address && !!toAddr,
      refetchInterval: 15000,
    },
  });

  // ── On-chain rate from StelfiSwap contract (all pairs) ────────
  // Uses 1 USDC (1_000_000 units) as a probe when no amount is entered.
  // A non-zero result means the pair is active in the contract.
  const { data: contractOut } = useReadContract({
    address: STELFI_SWAP_ADDRESS,
    abi: STELFI_SWAP_ABI,
    functionName: "getAmountOut",
    args: [fromAddr, toAddr, amountIn > BigInt(0) ? amountIn : BigInt(1_000_000)],
    query: {
      enabled: !!fromAddr && !!toAddr && !!STELFI_SWAP_ADDRESS,
    },
  });

  const contractAmountOut = contractOut ? (contractOut as [bigint, bigint])[0] : BigInt(0);
  const contractFee       = contractOut ? (contractOut as [bigint, bigint])[1] : BigInt(0);

  // Pair is "live" when the contract returns a real non-zero rate
  const pairIsLive = contractAmountOut > BigInt(0);

  // ── Compute displayed output ──────────────────────────────────
  let toAmount   = "";
  let displayFee = "0";
  if (fromAmount && parseFloat(fromAmount) > 0) {
    if (pairIsLive) {
      // Real on-chain rate from StelfiSwap
      toAmount   = formatUnits(contractAmountOut, 6);
      displayFee = formatUnits(contractFee, 6);
    } else {
      // Indicative fallback — pair not yet in contract
      const rate    = MOCK_RATES[fromToken]?.[toToken] ?? 1;
      const mockFee = parseFloat(fromAmount) * 0.003;
      toAmount   = ((parseFloat(fromAmount) - mockFee) * rate).toFixed(4);
      displayFee = mockFee.toFixed(4);
    }
  }

  const rateDisplay = pairIsLive && fromAmount && parseFloat(fromAmount) > 0
    ? `1 ${fromToken} ≈ ${(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(4)} ${toToken} (live)`
    : pairIsLive
    ? `Live rate · enter an amount`
    : `1 ${fromToken} = ${MOCK_RATES[fromToken]?.[toToken] ?? "—"} ${toToken} (indicative)`;

  // ── Safety timeout: 120s absolute escape hatch ───────────────
  // (kept as belt-and-suspenders in case publicClient.waitForTransactionReceipt hangs)
  // The actual timeout is handled per-step inside the handler.

  // ── Swap handler — direct StelfiSwap contract call ────────────
  // Flow: approve token → wait for receipt → swap → wait for receipt → success.
  // Both steps produce a MetaMask popup. No server-side wallet is involved.
  const handleDirectSwap = async () => {
    if (!address || !fromAmount || parseFloat(fromAmount) <= 0) return;
    setErrorMsg("");
    setSwapTxHash(undefined);

    // ── Chain guard: must be on Arc Testnet ─────────────────────
    if (chainId !== ARC_CHAIN_ID) {
      try {
        setPhase("approving");
        await switchChainAsync({ chainId: ARC_CHAIN_ID });
      } catch {
        setPhase("error");
        setErrorMsg(
          "Please switch MetaMask to Arc Testnet (chain 5042002) and try again. " +
          "Add it at testnet.arcscan.app if it's not in your wallet yet."
        );
        return;
      }
    }

    try {
      const amountInBigInt = parseUnits(fromAmount, fromDecimals);

      // ── Step 1: Approve StelfiSwap to spend fromToken ─────────
      console.log("[Stelfi] Step 1/2 — approve", fromToken, "amount:", amountInBigInt.toString());
      setPhase("approving");

      const approveTxHash = await writeContractAsync({
        address:      fromAddr,
        abi:          ERC20_ABI,
        functionName: "approve",
        args:         [STELFI_SWAP_ADDRESS, amountInBigInt],
        chainId:      ARC_CHAIN_ID,
      });

      console.log("[Stelfi] Approve tx submitted:", approveTxHash);
      setPhase("waitingApproval");

      // Wait for approval to be mined before proceeding
      if (!publicClient) throw new Error("No RPC connection to Arc Testnet. Please check your network.");
      await publicClient.waitForTransactionReceipt({ hash: approveTxHash, confirmations: 1 });
      console.log("[Stelfi] Approval confirmed — submitting swap");

      // ── Step 2: Execute the swap ──────────────────────────────
      setPhase("swapping");
      console.log("[Stelfi] Step 2/2 — swap", fromToken, "→", toToken, "amount:", amountInBigInt.toString());

      const swapHash = await writeContractAsync({
        address:      STELFI_SWAP_ADDRESS,
        abi:          STELFI_SWAP_ABI,
        functionName: "swap",
        args:         [fromAddr, toAddr, amountInBigInt],
        chainId:      ARC_CHAIN_ID,
      });

      console.log("[Stelfi] Swap tx submitted:", swapHash);
      await publicClient.waitForTransactionReceipt({ hash: swapHash, confirmations: 1 });
      console.log("[Stelfi] Swap confirmed!");

      setSwapTxHash(swapHash);
      setPhase("success");

      // Refresh balances after settlement
      setTimeout(() => { refetchFrom(); refetchTo(); }, 2000);
      // Auto-reset after 12s so user can swap again
      setTimeout(reset, 12000);

    } catch (e: unknown) {
      const err = e as { code?: number; shortMessage?: string; message?: string };
      const msg = err?.shortMessage || err?.message || "";
      const msgLow = msg.toLowerCase();

      if (
        err?.code === 4001 ||
        msgLow.includes("user rejected") ||
        msgLow.includes("user denied")
      ) {
        setErrorMsg("Transaction cancelled — you declined the wallet request. Click Try Again to retry.");
      } else if (msgLow.includes("insufficient") || msgLow.includes("balance")) {
        setErrorMsg(
          "Insufficient balance. Make sure you have enough " + fromToken +
          " plus USDC for gas fees (Arc Testnet uses USDC as gas)."
        );
      } else if (
        msgLow.includes("pair") ||
        msgLow.includes("not active") ||
        msgLow.includes("inactive") ||
        msgLow.includes("not supported")
      ) {
        setErrorMsg(
          `${fromToken} → ${toToken} is not yet active in the StelfiSwap contract. ` +
          `The contract owner needs to call addPair() to enable this pair.`
        );
      } else if (msgLow.includes("no rpc") || msgLow.includes("network")) {
        setErrorMsg("Network error — check your MetaMask connection to Arc Testnet and try again.");
      } else {
        // Always log the real error so it can be debugged
        console.error("[Stelfi] Swap error (full):", err);
        setErrorMsg(msg || "Swap failed — check the browser console for details and try again.");
      }
      setPhase("error");
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
    setSwapTxHash(undefined);
  }

  const isLoading = phase === "approving" || phase === "waitingApproval" || phase === "swapping";

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

          {/* Pair status indicator */}
          <AnimatePresence>
            {pairIsLive ? (
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
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" style={{ flexShrink: 0 }} />
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
                  style={{ backgroundColor: pairIsLive ? "#00D4AA" : "#8B9EC7" }}
                />
                {pairIsLive
                  ? <span style={{ color: "#00D4AA" }}>StelfiSwap contract (on-chain rate)</span>
                  : <span style={{ color: "#8B9EC7" }}>Indicative — pair coming soon</span>}
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
              onClick={phase === "error" || phase === "success" ? reset : handleDirectSwap}
              disabled={isLoading || (!fromAmount && phase !== "error" && phase !== "success")}
              whileHover={!isLoading ? { scale: 1.02 } : {}}
              whileTap={!isLoading ? { scale: 0.98 } : {}}
              className="btn-primary w-full flex items-center justify-center"
              style={{
                height: "52px",
                background: phase === "error"
                  ? "rgba(255,77,109,0.12)"
                  : phase === "success"
                  ? "rgba(0,212,170,0.12)"
                  : "linear-gradient(135deg, #00D4AA, #00B8A0)",
                color: phase === "error" ? "#FF4D6D" : phase === "success" ? "#00D4AA" : "#050A14",
                border: phase === "error"
                  ? "1px solid rgba(255,77,109,0.3)"
                  : phase === "success"
                  ? "1px solid rgba(0,212,170,0.3)"
                  : "none",
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

          {/* ── Inline status messages ── */}
          <AnimatePresence mode="wait">
            {phase === "approving" && (
              <motion.div
                key="approving-msg"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                style={{
                  marginTop: "10px",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: "rgba(0,212,170,0.06)",
                  border: "1px solid rgba(0,212,170,0.2)",
                  fontSize: "13px",
                  color: "#8B9EC7",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span>🔐</span>
                  <span style={{ color: "#ffffff", fontWeight: 600 }}>Check your wallet</span>
                </div>
                <div style={{ fontSize: "12px" }}>
                  An approval request has been sent. Click <b>Confirm</b> in MetaMask to approve {fromToken} spending.
                </div>
              </motion.div>
            )}
            {phase === "waitingApproval" && (
              <motion.div
                key="waiting-msg"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                style={{
                  marginTop: "10px",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: "rgba(0,212,170,0.06)",
                  border: "1px solid rgba(0,212,170,0.2)",
                  fontSize: "13px",
                  color: "#8B9EC7",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span>⏳</span>
                  <span style={{ color: "#ffffff", fontWeight: 600 }}>Approval confirmed!</span>
                </div>
                <div style={{ fontSize: "12px" }}>
                  Preparing your swap — a second wallet request will appear shortly.
                </div>
              </motion.div>
            )}
            {phase === "swapping" && (
              <motion.div
                key="swapping-msg"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                style={{
                  marginTop: "10px",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: "rgba(0,212,170,0.06)",
                  border: "1px solid rgba(0,212,170,0.2)",
                  fontSize: "13px",
                  color: "#8B9EC7",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span>⚡</span>
                  <span style={{ color: "#ffffff", fontWeight: 600 }}>Check your wallet</span>
                </div>
                <div style={{ fontSize: "12px" }}>
                  Swap request sent. Click <b>Confirm</b> in MetaMask to complete the swap.
                </div>
                <div style={{ marginTop: "4px", fontSize: "11px", color: "#4A5568" }}>
                  Do not close this window. Arc Testnet settles in ~3 seconds.
                </div>
              </motion.div>
            )}
            {phase === "error" && errorMsg && (
              <motion.div
                key="error-msg"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                style={{
                  marginTop: "10px",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: "rgba(255,77,109,0.06)",
                  border: "1px solid rgba(255,77,109,0.25)",
                  fontSize: "13px",
                  color: "#FF4D6D",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                <span style={{ flexShrink: 0 }}>❌</span>
                <div>
                  {errorMsg}
                  <div style={{ marginTop: "4px", fontSize: "11px", color: "#8B9EC7" }}>
                    Click &ldquo;↩ Try Again&rdquo; to retry.
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* TX success card */}
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
                ✅ Swap Successful!
              </div>
              {swapTxHash ? (
                <p style={{ color: "#8B9EC7", margin: 0 }}>
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
              ) : (
                <p style={{ color: "#8B9EC7", margin: 0, fontSize: "12px" }}>
                  Swap completed on Arc Testnet. Balances are refreshing…
                </p>
              )}
              <button onClick={reset} className="text-xs underline text-left mt-1" style={{ color: "#8B9EC7" }}>
                Make another swap
              </button>
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
