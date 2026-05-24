"use client";

import { useState, useEffect } from "react";
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
  STELFI_PREDICT_ADDRESS,
  STELFI_PREDICT_ABI,
  ARC_USDC_ADDRESS,
  ERC20_ABI,
} from "@/lib/contracts";
import {
  fadeUpVariants,
  staggerContainer,
  staggerItem,
} from "@/lib/animations";

// ── Types ─────────────────────────────────────────────────────
interface MarketData {
  id: bigint;
  question: string;
  closingTime: bigint;
  status: number;
  outcome: boolean;
  yesPool: bigint;
  noPool: bigint;
  totalFees: bigint;
}

interface MockMarket {
  id: number;
  question: string;
  closes: string;
  yesPercent: number;
  noPercent: number;
  pool: number;
}

const MOCK_MARKETS: MockMarket[] = [
  { id: 1, question: "Will BTC be above $120k by July 1, 2026?",      closes: "Jun 1, 2026", yesPercent: 64, noPercent: 36, pool: 1240 },
  { id: 2, question: "Will ETH hit $5k before Arc Mainnet launch?",   closes: "Jun 1, 2026", yesPercent: 41, noPercent: 59, pool: 890  },
  { id: 3, question: "Will the US Fed cut rates in June 2026?",        closes: "Jun 1, 2026", yesPercent: 55, noPercent: 45, pool: 2100 },
];

// ── Helpers ───────────────────────────────────────────────────
function formatClose(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}
function poolPercent(a: bigint, b: bigint): number {
  const total = a + b;
  if (total === BigInt(0)) return 50;
  return Math.round((Number(a) * 100) / Number(total));
}
function formatUSDC(val: bigint | undefined): string {
  if (val === undefined) return "--";
  const n = parseFloat(formatUnits(val, 6));
  if (n === 0) return "0.00";
  if (n < 0.01) return "< 0.01";
  if (n < 1000) return n.toFixed(2);
  return (n / 1000).toFixed(2) + "K";
}

type BetPhase = "idle" | "approving" | "betting" | "success" | "error";

// ── Page ──────────────────────────────────────────────────────
export default function PredictPage() {
  const { isConnected, address } = useAccount();
  const [betAmounts, setBetAmounts] = useState<Record<string, string>>({});
  const [betPhase,   setBetPhase]   = useState<Record<string, BetPhase>>({});
  const [betErrors,  setBetErrors]  = useState<Record<string, string>>({});
  const [betTxHashes, setBetTxHashes] = useState<Record<string, `0x${string}`>>({});
  const [pendingApprove, setPendingApprove] = useState<{ key: string; hash: `0x${string}` } | null>(null);
  const [pendingBet, setPendingBet] = useState<{ key: string; marketId: bigint; isYes: boolean; amount: bigint } | null>(null);

  // ── USDC balance ───────────────────────────────────────────
  const {
    data: usdcBalance,
    isLoading: usdcLoading,
    refetch: refetchBalance,
  } = useBalance({
    address,
    token: ARC_USDC_ADDRESS as `0x${string}`,
    chainId: 5042002,
    query: { enabled: !!address, refetchInterval: 10000 },
  });

  const usdcValue = usdcBalance?.value ?? BigInt(0);
  const usdcFloat = parseFloat(formatUnits(usdcValue, 6));

  // ── Markets ────────────────────────────────────────────────
  const { data: marketCount } = useReadContract({
    address: STELFI_PREDICT_ADDRESS,
    abi: STELFI_PREDICT_ABI,
    functionName: "getMarketCount",
    query: { enabled: !!STELFI_PREDICT_ADDRESS },
  });
  const count = marketCount ? Number(marketCount as bigint) : 0;

  const { data: marketsRaw } = useReadContract({
    address: STELFI_PREDICT_ADDRESS,
    abi: STELFI_PREDICT_ABI,
    functionName: "getMarkets",
    args: [BigInt(1), count > 0 ? BigInt(count) : BigInt(1)],
    query: { enabled: !!STELFI_PREDICT_ADDRESS && count > 0 },
  });

  const liveMarkets: MarketData[] = marketsRaw ? (marketsRaw as MarketData[]) : [];
  const usingLive = liveMarkets.length > 0;

  // ── Write ──────────────────────────────────────────────────
  const { writeContractAsync: writeApprove } = useWriteContract();
  const { writeContractAsync: writeBet }     = useWriteContract();

  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: pendingApprove?.hash,
    query: { enabled: !!pendingApprove },
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!approveConfirmed || !pendingApprove || !pendingBet) return;
    const key = pendingApprove.key;
    setBetPhase((p) => ({ ...p, [key]: "betting" }));
    writeBet({
      address: STELFI_PREDICT_ADDRESS,
      abi: STELFI_PREDICT_ABI,
      functionName: "placeBet",
      args: [pendingBet.marketId, pendingBet.isYes, pendingBet.amount],
    })
      .then((hash) => {
        setBetTxHashes((h) => ({ ...h, [key]: hash }));
        setBetPhase((p) => ({ ...p, [key]: "success" }));
        refetchBalance();
      })
      .catch((e: unknown) => {
        const err = e as { shortMessage?: string; message?: string };
        setBetPhase((p) => ({ ...p, [key]: "error" }));
        setBetErrors((m) => ({ ...m, [key]: err?.shortMessage || err?.message || "Bet failed" }));
      })
      .finally(() => {
        setPendingApprove(null);
        setPendingBet(null);
      });
  }, [approveConfirmed]);

  async function handleBet(marketId: bigint | number, isYes: boolean) {
    const key    = `${marketId}-${isYes ? "YES" : "NO"}`;
    const amtStr = betAmounts[String(marketId)] || "";
    if (!amtStr || parseFloat(amtStr) <= 0) return;
    const amount = parseUnits(amtStr, 6);

    setBetPhase((p) => ({ ...p, [key]: "approving" }));
    setBetErrors((m) => ({ ...m, [key]: "" }));

    try {
      const hash = await writeApprove({
        address: ARC_USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [STELFI_PREDICT_ADDRESS, amount],
      });
      setPendingApprove({ key, hash });
      setPendingBet({ key, marketId: BigInt(marketId), isYes, amount });
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      setBetPhase((p) => ({ ...p, [key]: "error" }));
      setBetErrors((m) => ({ ...m, [key]: err?.shortMessage || err?.message || "Approval failed" }));
    }
  }

  function setQuickBet(marketId: string | number | bigint, pct: number) {
    if (!usdcBalance) return;
    const val = (usdcFloat * pct) / 100;
    setBetAmounts((a) => ({ ...a, [String(marketId)]: val.toFixed(2) }));
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen pt-8 pb-16" style={{ position: "relative", zIndex: 1 }}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <motion.div variants={staggerContainer} className="mb-8">
          <motion.div variants={staggerItem} className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-black text-white">Stelfi Predict</h1>
            <NetworkBadge />
          </motion.div>
          <motion.p variants={staggerItem} className="text-sm" style={{ color: "#00D4AA" }}>
            Stake USDC on real-world outcomes
          </motion.p>
        </motion.div>

        {/* USDC Balance Banner */}
        <motion.div variants={fadeUpVariants} className="glass-card p-5 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black"
              style={{ background: "rgba(0,212,170,0.12)", color: "#00D4AA" }}
            >
              $
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: "#8B9EC7" }}>Available to Bet</p>
              {!isConnected ? (
                <p className="text-sm font-medium" style={{ color: "#4A5568" }}>Connect wallet to see balance</p>
              ) : usdcLoading ? (
                <div className="h-6 w-28 rounded shimmer mt-1" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black" style={{ color: "#00D4AA" }}>
                    {formatUSDC(usdcValue)}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: "#8B9EC7" }}>USDC</span>
                  {usdcFloat === 0 && isConnected && (
                    <a
                      href="https://faucet.circle.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline ml-2"
                      style={{ color: "#00D4AA" }}
                    >
                      Get testnet USDC →
                    </a>
                  )}
                </div>
              )}
              <p className="text-xs mt-0.5" style={{ color: "#4A5568" }}>in your connected wallet</p>
            </div>
          </div>
          {!isConnected && (
            <ConnectButton label="Connect Wallet" />
          )}
        </motion.div>

        {/* Demo banner */}
        {!usingLive && (
          <motion.div
            variants={fadeUpVariants}
            className="glass-card px-4 py-2.5 mb-6 flex items-center gap-2 text-xs"
            style={{ color: "#8B9EC7" }}
          >
            <span>ℹ</span>
            Showing demo markets — connect wallet and seed contracts to see live markets
          </motion.div>
        )}

        {/* Markets grid */}
        <motion.div
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12"
        >
          {usingLive
            ? liveMarkets.map((m) => (
                <motion.div key={String(m.id)} variants={staggerItem}>
                  <LiveMarketCard
                    market={m}
                    isConnected={isConnected}
                    usdcFloat={usdcFloat}
                    betAmount={betAmounts[String(m.id)] || ""}
                    onBetAmountChange={(v) => setBetAmounts((a) => ({ ...a, [String(m.id)]: v }))}
                    onQuickBet={(pct) => setQuickBet(m.id, pct)}
                    onBet={(isYes) => handleBet(m.id, isYes)}
                    yesPhase={betPhase[`${m.id}-YES`] || "idle"}
                    noPhase={betPhase[`${m.id}-NO`]  || "idle"}
                    yesTxHash={betTxHashes[`${m.id}-YES`]}
                    noTxHash={betTxHashes[`${m.id}-NO`]}
                    yesError={betErrors[`${m.id}-YES`] || ""}
                    noError={betErrors[`${m.id}-NO`]   || ""}
                  />
                </motion.div>
              ))
            : MOCK_MARKETS.map((m) => (
                <motion.div key={m.id} variants={staggerItem}>
                  <MockMarketCard
                    market={m}
                    isConnected={isConnected}
                    usdcFloat={usdcFloat}
                    betAmount={betAmounts[String(m.id)] || ""}
                    onBetAmountChange={(v) => setBetAmounts((a) => ({ ...a, [String(m.id)]: v }))}
                    onQuickBet={(pct) => setQuickBet(m.id, pct)}
                    onBet={(isYes) => handleBet(m.id, isYes)}
                    yesPhase={betPhase[`${m.id}-YES`] || "idle"}
                    noPhase={betPhase[`${m.id}-NO`]  || "idle"}
                  />
                </motion.div>
              ))}
        </motion.div>

        {/* My Bets */}
        <MyBetsSection isConnected={isConnected} address={address} markets={liveMarkets} />
      </div>
    </div>
  );
}

// ── Live market card ──────────────────────────────────────────
function LiveMarketCard({
  market, isConnected, usdcFloat, betAmount, onBetAmountChange,
  onQuickBet, onBet, yesPhase, noPhase, yesTxHash, noTxHash, yesError, noError,
}: {
  market: MarketData; isConnected: boolean; usdcFloat: number;
  betAmount: string; onBetAmountChange: (v: string) => void;
  onQuickBet: (pct: number) => void;
  onBet: (isYes: boolean) => void;
  yesPhase: BetPhase; noPhase: BetPhase;
  yesTxHash?: `0x${string}`; noTxHash?: `0x${string}`;
  yesError: string; noError: string;
}) {
  const yesP = poolPercent(market.yesPool, market.noPool);
  const totalPool = Number(formatUnits(market.yesPool + market.noPool, 6)).toFixed(2);
  const statusLabel = ["OPEN", "CLOSED", "RESOLVED"][market.status] ?? "OPEN";
  const statusColor = market.status === 0 ? "#00D4AA" : market.status === 1 ? "#FFB547" : "#8B9EC7";
  const txHash  = yesTxHash || noTxHash;
  const succeeded = yesPhase === "success" || noPhase === "success";

  return (
    <MarketCardShell
      question={market.question}
      statusLabel={statusLabel}
      statusColor={statusColor}
      closes={formatClose(market.closingTime)}
      yesP={yesP} noP={100 - yesP}
      totalPool={totalPool}
      isConnected={isConnected}
      usdcFloat={usdcFloat}
      betAmount={betAmount}
      onBetAmountChange={onBetAmountChange}
      onQuickBet={onQuickBet}
      onBet={onBet}
      yesPhase={yesPhase} noPhase={noPhase}
      txHash={txHash} succeeded={succeeded}
      error={yesError || noError}
    />
  );
}

// ── Mock market card ──────────────────────────────────────────
function MockMarketCard({
  market, isConnected, usdcFloat, betAmount, onBetAmountChange,
  onQuickBet, onBet, yesPhase, noPhase,
}: {
  market: MockMarket; isConnected: boolean; usdcFloat: number;
  betAmount: string; onBetAmountChange: (v: string) => void;
  onQuickBet: (pct: number) => void;
  onBet: (isYes: boolean) => void;
  yesPhase: BetPhase; noPhase: BetPhase;
}) {
  return (
    <MarketCardShell
      question={market.question}
      statusLabel="OPEN"
      statusColor="#00D4AA"
      closes={market.closes}
      yesP={market.yesPercent} noP={market.noPercent}
      totalPool={market.pool.toLocaleString()}
      isConnected={isConnected}
      usdcFloat={usdcFloat}
      betAmount={betAmount}
      onBetAmountChange={onBetAmountChange}
      onQuickBet={onQuickBet}
      onBet={onBet}
      yesPhase={yesPhase} noPhase={noPhase}
      txHash={undefined} succeeded={false} error=""
    />
  );
}

// ── Shared card shell ─────────────────────────────────────────
function MarketCardShell({
  question, statusLabel, statusColor, closes, yesP, noP, totalPool,
  isConnected, usdcFloat, betAmount, onBetAmountChange, onQuickBet, onBet,
  yesPhase, noPhase, txHash, succeeded, error,
}: {
  question: string; statusLabel: string; statusColor: string;
  closes: string; yesP: number; noP: number; totalPool: string;
  isConnected: boolean; usdcFloat: number; betAmount: string;
  onBetAmountChange: (v: string) => void;
  onQuickBet: (pct: number) => void;
  onBet: (isYes: boolean) => void;
  yesPhase: BetPhase; noPhase: BetPhase;
  txHash?: `0x${string}`; succeeded: boolean; error: string;
}) {
  const isPending = yesPhase === "approving" || yesPhase === "betting" || noPhase === "approving" || noPhase === "betting";
  const betNum = parseFloat(betAmount) || 0;
  const isInsufficient = isConnected && betNum > 0 && betNum > usdcFloat;

  return (
    <div className="glass-card flex flex-col gap-4 p-5 h-full">
      <div className="flex items-start justify-between">
        <span
          className="px-2.5 py-0.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: `${statusColor}22`, color: statusColor }}
        >
          {statusLabel}
        </span>
        <span className="text-xs" style={{ color: "#8B9EC7" }}>Closes {closes}</span>
      </div>

      <p className="font-semibold text-white leading-snug">{question}</p>

      {/* Odds bar */}
      <div>
        <div className="flex justify-between text-xs font-bold mb-1.5">
          <span style={{ color: "#00D4AA" }}>YES {yesP}%</span>
          <span style={{ color: "#FF4D6D" }}>NO {noP}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,77,109,0.3)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #00D4AA, #00FFD1)" }}
            initial={{ width: 0 }}
            animate={{ width: `${yesP}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
          />
        </div>
      </div>

      <p className="text-xs" style={{ color: "#8B9EC7" }}>
        Total Pool: <span className="text-white font-semibold">{totalPool} USDC</span>
      </p>

      {/* Bet input */}
      <div>
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-2"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: isInsufficient
              ? "1px solid rgba(255,77,109,0.5)"
              : "1px solid rgba(255,255,255,0.08)",
            boxShadow: isInsufficient ? "0 0 0 3px rgba(255,77,109,0.1)" : undefined,
          }}
        >
          <input
            type="number"
            placeholder="Amount"
            value={betAmount}
            onChange={(e) => onBetAmountChange(e.target.value)}
            disabled={!isConnected || isPending}
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-600 disabled:opacity-50"
            min="0"
          />
          <span className="text-xs font-semibold" style={{ color: "#8B9EC7" }}>USDC</span>
        </div>

        {/* Insufficient balance error */}
        <AnimatePresence>
          {isInsufficient && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs mb-2"
              style={{ color: "#FF4D6D" }}
            >
              Insufficient balance
            </motion.p>
          )}
        </AnimatePresence>

        {/* Quick bet buttons */}
        {isConnected && usdcFloat > 0 && (
          <div className="flex gap-2 mb-0.5">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => onQuickBet(pct)}
                disabled={isPending}
                className="flex-1 rounded-lg py-1 text-xs font-semibold transition-all duration-200 disabled:opacity-40"
                style={{
                  background: "rgba(0,212,170,0.08)",
                  border: "1px solid rgba(0,212,170,0.2)",
                  color: "#00D4AA",
                }}
              >
                {pct === 100 ? "MAX" : `${pct}%`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* YES / NO buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onBet(true)}
          disabled={!isConnected || isPending || !betAmount || isInsufficient}
          className="btn-yes h-10 flex items-center justify-center gap-1 text-sm"
        >
          {(yesPhase === "approving" || yesPhase === "betting")
            ? <span className="animate-spin">⟳</span>
            : "YES ↑"}
        </button>
        <button
          onClick={() => onBet(false)}
          disabled={!isConnected || isPending || !betAmount || isInsufficient}
          className="btn-no h-10 flex items-center justify-center gap-1 text-sm"
        >
          {(noPhase === "approving" || noPhase === "betting")
            ? <span className="animate-spin">⟳</span>
            : "NO ↓"}
        </button>
      </div>

      {/* Status */}
      <AnimatePresence>
        {succeeded && txHash && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-xl p-3 text-xs"
            style={{ background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.3)" }}
          >
            <span style={{ color: "#00D4AA" }}>✓ Bet placed! </span>
            <a
              href={`https://testnet.arcscan.app/tx/${txHash}`}
              target="_blank" rel="noopener noreferrer"
              className="underline" style={{ color: "#00D4AA" }}
            >
              View on ArcScan →
            </a>
          </motion.div>
        )}
      </AnimatePresence>
      {error && <p className="text-xs" style={{ color: "#FF4D6D" }}>✕ {error}</p>}
      {!isConnected && (
        <p className="text-center text-xs" style={{ color: "#8B9EC7" }}>Connect wallet to place a bet</p>
      )}
    </div>
  );
}

// ── My Bets ───────────────────────────────────────────────────
function MyBetsSection({ isConnected, address, markets }: {
  isConnected: boolean; address?: `0x${string}`; markets: MarketData[];
}) {
  return (
    <motion.div variants={fadeUpVariants}>
      <h2 className="text-lg font-bold text-white mb-5">My Bets</h2>

      {!isConnected ? (
        <div className="glass-card p-8 flex flex-col items-center gap-4">
          <span className="text-4xl opacity-20">◎</span>
          <p style={{ color: "#8B9EC7" }}>Connect your wallet to see your bets</p>
          <ConnectButton label="Connect Wallet" />
        </div>
      ) : markets.length === 0 ? (
        <div className="glass-card p-8 flex flex-col items-center gap-3">
          <span className="text-4xl opacity-20">◎</span>
          <p className="font-semibold text-white">No active bets yet</p>
          <p className="text-sm" style={{ color: "#8B9EC7" }}>Place a bet above to get started</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          {markets.map((m) => (
            <UserBetRow key={String(m.id)} market={m} address={address!} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Per-market user bet row ───────────────────────────────────
function UserBetRow({ market, address }: { market: MarketData; address: `0x${string}` }) {
  const { data: betData } = useReadContract({
    address: STELFI_PREDICT_ADDRESS,
    abi: STELFI_PREDICT_ABI,
    functionName: "getUserBet",
    args: [market.id, address],
    query: { enabled: !!address && !!STELFI_PREDICT_ADDRESS },
  });

  const [yesAmt, noAmt, claimed] = betData
    ? (betData as [bigint, bigint, boolean])
    : [BigInt(0), BigInt(0), false];

  if (yesAmt === BigInt(0) && noAmt === BigInt(0)) return null;

  const side   = yesAmt > BigInt(0) ? "YES" : "NO";
  const amount = yesAmt > BigInt(0) ? yesAmt : noAmt;
  const statusLabel = ["Open", "Closed", "Resolved"][market.status] ?? "Open";
  const canClaim =
    market.status === 2 &&
    !claimed &&
    ((market.outcome && yesAmt > BigInt(0)) || (!market.outcome && noAmt > BigInt(0)));

  return <ClaimRow market={market} side={side} amount={amount} statusLabel={statusLabel} canClaim={canClaim} claimed={claimed} />;
}

function ClaimRow({ market, side, amount, statusLabel, canClaim, claimed }: {
  market: MarketData; side: string; amount: bigint;
  statusLabel: string; canClaim: boolean; claimed: boolean;
}) {
  const [claimPhase, setClaimPhase] = useState<"idle" | "claiming" | "done" | "error">("idle");
  const [claimTxHash, setClaimTxHash] = useState<`0x${string}` | undefined>();
  const [claimError, setClaimError]   = useState("");
  const { writeContractAsync: writeClaim } = useWriteContract();

  const { isSuccess: claimConfirmed } = useWaitForTransactionReceipt({
    hash: claimTxHash,
    query: { enabled: !!claimTxHash },
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (claimConfirmed && claimPhase === "claiming") setClaimPhase("done");
  }, [claimConfirmed]);

  async function handleClaim() {
    setClaimPhase("claiming");
    try {
      const hash = await writeClaim({
        address: STELFI_PREDICT_ADDRESS,
        abi: STELFI_PREDICT_ABI,
        functionName: "claimWinnings",
        args: [market.id],
      });
      setClaimTxHash(hash);
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      setClaimPhase("error");
      setClaimError(err?.shortMessage || err?.message || "Claim failed");
    }
  }

  return (
    <div
      className="flex items-center justify-between px-5 py-4 border-b last:border-b-0 text-sm"
      style={{ borderColor: "rgba(255,255,255,0.06)" }}
    >
      <p className="text-white flex-1 mr-4 truncate">{market.question}</p>
      <span className="mr-4 font-bold" style={{ color: side === "YES" ? "#00D4AA" : "#FF4D6D" }}>{side}</span>
      <span className="mr-4" style={{ color: "#8B9EC7" }}>{formatUnits(amount, 6)} USDC</span>
      <span className="mr-4" style={{ color: "#8B9EC7" }}>{statusLabel}</span>
      <div className="min-w-[100px] text-right">
        {canClaim && claimPhase === "idle" && (
          <button
            onClick={handleClaim}
            className="btn-primary px-3 py-1 text-xs font-bold rounded-lg"
            style={{ background: "linear-gradient(135deg,#00D4AA,#00B8A0)", color: "#050A14" }}
          >
            Claim Winnings
          </button>
        )}
        {claimPhase === "claiming" && <span className="animate-spin text-xs" style={{ color: "#00D4AA" }}>⟳</span>}
        {claimPhase === "done" && claimTxHash && (
          <a href={`https://testnet.arcscan.app/tx/${claimTxHash}`} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: "#00D4AA" }}>
            Claimed ✓
          </a>
        )}
        {claimPhase === "error" && <span className="text-xs" style={{ color: "#FF4D6D" }}>✕ {claimError}</span>}
        {claimed && claimPhase === "idle" && <span className="text-xs" style={{ color: "#8B9EC7" }}>Claimed</span>}
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
