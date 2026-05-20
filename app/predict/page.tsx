"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseUnits, formatUnits } from "viem";
import {
  STELFI_PREDICT_ADDRESS,
  STELFI_PREDICT_ABI,
  ARC_USDC_ADDRESS,
  ERC20_ABI,
} from "@/lib/contracts";

// ── Types ──────────────────────────────────────────────────
interface MarketData {
  id: bigint;
  question: string;
  closingTime: bigint;
  status: number; // 0=Open 1=Closed 2=Resolved
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
  { id: 1, question: "Will BTC be above $120k by July 1, 2026?", closes: "Jun 1, 2026", yesPercent: 64, noPercent: 36, pool: 1240 },
  { id: 2, question: "Will ETH hit $5k before Arc Mainnet launch?", closes: "Jun 1, 2026", yesPercent: 41, noPercent: 59, pool: 890 },
  { id: 3, question: "Will the US Fed cut rates in June 2026?", closes: "Jun 1, 2026", yesPercent: 55, noPercent: 45, pool: 2100 },
];

// ── Helpers ────────────────────────────────────────────────
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

type BetPhase = "idle" | "approving" | "betting" | "success" | "error";

// ── Page ───────────────────────────────────────────────────
export default function PredictPage() {
  const { isConnected, address } = useAccount();
  const [betAmounts, setBetAmounts] = useState<Record<string, string>>({});
  const [betPhase, setBetPhase] = useState<Record<string, BetPhase>>({});
  const [betErrors, setBetErrors] = useState<Record<string, string>>({});
  const [betTxHashes, setBetTxHashes] = useState<Record<string, `0x${string}`>>({});
  const [pendingApprove, setPendingApprove] = useState<{ key: string; hash: `0x${string}` } | null>(null);
  const [pendingBet, setPendingBet] = useState<{ key: string; marketId: bigint; isYes: boolean; amount: bigint } | null>(null);

  // ── Read: market count ─────────────────────────────────────
  const { data: marketCount } = useReadContract({
    address: STELFI_PREDICT_ADDRESS,
    abi: STELFI_PREDICT_ABI,
    functionName: "getMarketCount",
    query: { enabled: !!STELFI_PREDICT_ADDRESS },
  });

  const count = marketCount ? Number(marketCount as bigint) : 0;

  // ── Read: all markets ──────────────────────────────────────
  const { data: marketsRaw } = useReadContract({
    address: STELFI_PREDICT_ADDRESS,
    abi: STELFI_PREDICT_ABI,
    functionName: "getMarkets",
    args: [BigInt(1), count > 0 ? BigInt(count) : BigInt(1)],
    query: { enabled: !!STELFI_PREDICT_ADDRESS && count > 0 },
  });

  const liveMarkets: MarketData[] = marketsRaw ? (marketsRaw as MarketData[]) : [];
  const usingLive = liveMarkets.length > 0;

  // ── Write: approve + placeBet ──────────────────────────────
  const { writeContractAsync: writeApprove } = useWriteContract();
  const { writeContractAsync: writeBet } = useWriteContract();

  // ── Wait for approval ──────────────────────────────────────
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
      })
      .catch((e: unknown) => {
        const err = e as { shortMessage?: string; message?: string };
        setBetPhase((p) => ({ ...p, [key]: "error" }));
        setBetErrors((errMap) => ({ ...errMap, [key]: err?.shortMessage || err?.message || "Bet failed" }));
      })
      .finally(() => {
        setPendingApprove(null);
        setPendingBet(null);
      });
  }, [approveConfirmed]);

  async function handleBet(marketId: bigint | number, isYes: boolean) {
    const key = `${marketId}-${isYes ? "YES" : "NO"}`;
    const amtStr = betAmounts[String(marketId)] || "";
    if (!amtStr || parseFloat(amtStr) <= 0) return;
    const amount = parseUnits(amtStr, 6);

    setBetPhase((p) => ({ ...p, [key]: "approving" }));
    setBetErrors((e) => ({ ...e, [key]: "" }));

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
      setBetErrors((errMap) => ({ ...errMap, [key]: err?.shortMessage || err?.message || "Approval failed" }));
    }
  }

  return (
    <div className="flex flex-col items-center px-6 pt-12 pb-16">
      {/* Header */}
      <div className="w-full max-w-4xl mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-white">Stelfi Predict</h1>
          <NetworkBadge />
        </div>
        <p className="text-sm" style={{ color: "#00D4AA" }}>
          Stake USDC on real-world outcomes
        </p>
      </div>

      {/* Demo banner when using mock data */}
      {!usingLive && (
        <div
          className="w-full max-w-4xl mb-4 px-4 py-2 rounded-xl text-xs flex items-center gap-2"
          style={{ backgroundColor: "#1A2340", border: "1px solid #1E2D4A", color: "#8B9EC7" }}
        >
          <span>ℹ</span> Showing demo markets — connect wallet and seed contracts to see live markets
        </div>
      )}

      {/* Active markets */}
      <div className="w-full max-w-4xl mb-12">
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-lg font-semibold text-white">Active Markets</h2>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {usingLive
            ? liveMarkets.map((m) => (
                <LiveMarketCard
                  key={String(m.id)}
                  market={m}
                  isConnected={isConnected}
                  betAmount={betAmounts[String(m.id)] || ""}
                  onBetAmountChange={(v) =>
                    setBetAmounts((a) => ({ ...a, [String(m.id)]: v }))
                  }
                  onBet={(isYes) => handleBet(m.id, isYes)}
                  yesPhase={betPhase[`${m.id}-YES`] || "idle"}
                  noPhase={betPhase[`${m.id}-NO`] || "idle"}
                  yesTxHash={betTxHashes[`${m.id}-YES`]}
                  noTxHash={betTxHashes[`${m.id}-NO`]}
                  yesError={betErrors[`${m.id}-YES`] || ""}
                  noError={betErrors[`${m.id}-NO`] || ""}
                />
              ))
            : MOCK_MARKETS.map((m) => (
                <MockMarketCard
                  key={m.id}
                  market={m}
                  isConnected={isConnected}
                  betAmount={betAmounts[String(m.id)] || ""}
                  onBetAmountChange={(v) =>
                    setBetAmounts((a) => ({ ...a, [String(m.id)]: v }))
                  }
                  onBet={(isYes) => handleBet(m.id, isYes)}
                  yesPhase={betPhase[`${m.id}-YES`] || "idle"}
                  noPhase={betPhase[`${m.id}-NO`] || "idle"}
                />
              ))}
        </div>
      </div>

      {/* My Bets */}
      <MyBetsSection isConnected={isConnected} address={address} markets={liveMarkets} />
    </div>
  );
}

// ── Live market card ───────────────────────────────────────
function LiveMarketCard({
  market, isConnected, betAmount, onBetAmountChange, onBet,
  yesPhase, noPhase, yesTxHash, noTxHash, yesError, noError,
}: {
  market: MarketData; isConnected: boolean; betAmount: string;
  onBetAmountChange: (v: string) => void; onBet: (isYes: boolean) => void;
  yesPhase: BetPhase; noPhase: BetPhase;
  yesTxHash?: `0x${string}`; noTxHash?: `0x${string}`;
  yesError: string; noError: string;
}) {
  const yesP = poolPercent(market.yesPool, market.noPool);
  const noP = 100 - yesP;
  const totalPool = Number(formatUnits(market.yesPool + market.noPool, 6)).toFixed(2);
  const statusLabel = ["OPEN", "CLOSED", "RESOLVED"][market.status] ?? "OPEN";
  const statusColor = market.status === 0 ? "#00D4AA" : market.status === 1 ? "#F59E0B" : "#8B9EC7";

  const isPending = yesPhase === "approving" || yesPhase === "betting" || noPhase === "approving" || noPhase === "betting";
  const txHash = yesTxHash || noTxHash;
  const succeeded = yesPhase === "success" || noPhase === "success";

  return (
    <MarketCardShell
      question={market.question}
      statusLabel={statusLabel}
      statusColor={statusColor}
      closes={formatClose(market.closingTime)}
      yesP={yesP} noP={noP}
      totalPool={totalPool}
      isConnected={isConnected}
      betAmount={betAmount}
      onBetAmountChange={onBetAmountChange}
      onBet={onBet}
      isPending={isPending}
      yesPhase={yesPhase}
      noPhase={noPhase}
      txHash={txHash}
      succeeded={succeeded}
      error={yesError || noError}
    />
  );
}

// ── Mock market card ───────────────────────────────────────
function MockMarketCard({
  market, isConnected, betAmount, onBetAmountChange, onBet, yesPhase, noPhase,
}: {
  market: MockMarket; isConnected: boolean; betAmount: string;
  onBetAmountChange: (v: string) => void; onBet: (isYes: boolean) => void;
  yesPhase: BetPhase; noPhase: BetPhase;
}) {
  const isPending = yesPhase === "approving" || yesPhase === "betting" || noPhase === "approving" || noPhase === "betting";
  return (
    <MarketCardShell
      question={market.question}
      statusLabel="OPEN"
      statusColor="#00D4AA"
      closes={market.closes}
      yesP={market.yesPercent}
      noP={market.noPercent}
      totalPool={market.pool.toLocaleString()}
      isConnected={isConnected}
      betAmount={betAmount}
      onBetAmountChange={onBetAmountChange}
      onBet={onBet}
      isPending={isPending}
      yesPhase={yesPhase}
      noPhase={noPhase}
      txHash={undefined}
      succeeded={false}
      error=""
    />
  );
}

// ── Shared card shell ──────────────────────────────────────
function MarketCardShell({
  question, statusLabel, statusColor, closes, yesP, noP, totalPool,
  isConnected, betAmount, onBetAmountChange, onBet,
  isPending, yesPhase, noPhase, txHash, succeeded, error,
}: {
  question: string; statusLabel: string; statusColor: string;
  closes: string; yesP: number; noP: number; totalPool: string;
  isConnected: boolean; betAmount: string;
  onBetAmountChange: (v: string) => void; onBet: (isYes: boolean) => void;
  isPending: boolean; yesPhase: BetPhase; noPhase: BetPhase;
  txHash?: `0x${string}`; succeeded: boolean; error: string;
}) {
  return (
    <div
      className="flex flex-col gap-4 p-5 rounded-xl border"
      style={{ backgroundColor: "#1A2340", borderColor: "#1E2D4A" }}
    >
      <div className="flex items-start justify-between">
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: `${statusColor}22`, color: statusColor }}>
          {statusLabel}
        </span>
        <span className="text-xs" style={{ color: "#8B9EC7" }}>Closes {closes}</span>
      </div>
      <p className="font-semibold text-white leading-snug">{question}</p>

      {/* YES/NO bar */}
      <div>
        <div className="flex justify-between text-xs font-medium mb-1.5">
          <span style={{ color: "#00D4AA" }}>YES {yesP}%</span>
          <span style={{ color: "#FF4D6D" }}>NO {noP}%</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#FF4D6D" }}>
          <div className="h-full rounded-full" style={{ width: `${yesP}%`, backgroundColor: "#00D4AA" }} />
        </div>
      </div>

      <p className="text-xs" style={{ color: "#8B9EC7" }}>
        Total Pool: <span className="text-white font-medium">{totalPool} USDC</span>
      </p>

      {/* Bet input */}
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2"
        style={{ backgroundColor: "#0A0F1E", border: "1px solid #1E2D4A" }}
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
        <span className="text-xs font-medium" style={{ color: "#8B9EC7" }}>USDC</span>
      </div>

      {/* YES / NO buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onBet(true)}
          disabled={!isConnected || isPending || !betAmount}
          className="h-10 rounded-lg font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          style={{ backgroundColor: "#00D4AA", color: "#0A0F1E" }}
        >
          {(yesPhase === "approving" || yesPhase === "betting") ? <span className="animate-spin">⟳</span> : "YES ↑"}
        </button>
        <button
          onClick={() => onBet(false)}
          disabled={!isConnected || isPending || !betAmount}
          className="h-10 rounded-lg font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          style={{ backgroundColor: "#FF4D6D", color: "#FFFFFF" }}
        >
          {(noPhase === "approving" || noPhase === "betting") ? <span className="animate-spin">⟳</span> : "NO ↓"}
        </button>
      </div>

      {/* Status */}
      {succeeded && txHash && (
        <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "#00D4AA11", border: "1px solid #00D4AA44" }}>
          <span style={{ color: "#00D4AA" }}>✓ Bet placed! </span>
          <a
            href={`https://testnet.arcscan.app/tx/${txHash}`}
            target="_blank" rel="noopener noreferrer"
            className="underline" style={{ color: "#00D4AA" }}
          >
            View on ArcScan →
          </a>
        </div>
      )}
      {error && (
        <p className="text-xs" style={{ color: "#FF4D6D" }}>✕ {error}</p>
      )}
      {!isConnected && (
        <p className="text-center text-xs" style={{ color: "#8B9EC7" }}>Connect wallet to place a bet</p>
      )}
    </div>
  );
}

// ── My Bets ────────────────────────────────────────────────
function MyBetsSection({ isConnected, address, markets }: {
  isConnected: boolean; address?: `0x${string}`; markets: MarketData[];
}) {
  return (
    <div className="w-full max-w-4xl">
      <h2 className="text-lg font-semibold text-white mb-5">My Bets</h2>

      {!isConnected ? (
        <div
          className="rounded-2xl border p-8 flex flex-col items-center gap-4"
          style={{ backgroundColor: "#1A2340", borderColor: "#1E2D4A" }}
        >
          <span className="text-4xl opacity-30">◎</span>
          <p style={{ color: "#8B9EC7" }}>Connect your wallet to see your bets</p>
          <ConnectButton label="Connect Wallet" />
        </div>
      ) : markets.length === 0 ? (
        <div
          className="rounded-2xl border p-8 flex flex-col items-center gap-3"
          style={{ backgroundColor: "#1A2340", borderColor: "#1E2D4A" }}
        >
          <span className="text-4xl opacity-30">◎</span>
          <p className="font-medium text-white">No active bets yet</p>
          <p className="text-sm" style={{ color: "#8B9EC7" }}>Place a bet above to get started</p>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: "#1A2340", borderColor: "#1E2D4A" }}>
          {markets.map((m) => (
            <UserBetRow key={String(m.id)} market={m} address={address!} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Per-market user bet row ────────────────────────────────
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

  const side = yesAmt > BigInt(0) ? "YES" : "NO";
  const amount = yesAmt > BigInt(0) ? yesAmt : noAmt;
  const statusLabel = ["Open", "Closed", "Resolved"][market.status] ?? "Open";
  const canClaim =
    market.status === 2 &&
    !claimed &&
    ((market.outcome && yesAmt > BigInt(0)) || (!market.outcome && noAmt > BigInt(0)));

  return (
    <ClaimRow
      market={market}
      side={side}
      amount={amount}
      statusLabel={statusLabel}
      canClaim={canClaim}
      claimed={claimed}
    />
  );
}

function ClaimRow({ market, side, amount, statusLabel, canClaim, claimed }: {
  market: MarketData; side: string; amount: bigint;
  statusLabel: string; canClaim: boolean; claimed: boolean;
}) {
  const [claimPhase, setClaimPhase] = useState<"idle" | "claiming" | "done" | "error">("idle");
  const [claimTxHash, setClaimTxHash] = useState<`0x${string}` | undefined>();
  const [claimError, setClaimError] = useState("");
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
      style={{ borderColor: "#1E2D4A" }}
    >
      <p className="text-white flex-1 mr-4 truncate">{market.question}</p>
      <span className="mr-4 font-semibold" style={{ color: side === "YES" ? "#00D4AA" : "#FF4D6D" }}>{side}</span>
      <span className="mr-4" style={{ color: "#8B9EC7" }}>{formatUnits(amount, 6)} USDC</span>
      <span className="mr-4" style={{ color: "#8B9EC7" }}>{statusLabel}</span>
      <div className="min-w-[100px] text-right">
        {canClaim && claimPhase === "idle" && (
          <button onClick={handleClaim} className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: "#00D4AA", color: "#0A0F1E" }}>
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
      className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5"
      style={{ backgroundColor: "#00D4AA11", color: "#00D4AA", border: "1px solid #00D4AA44" }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
      Arc Testnet
    </span>
  );
}
