"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseUnits, formatUnits } from "viem";
import {
  STELFI_SWAP_ADDRESS,
  STELFI_SWAP_ABI,
  TOKEN_ADDRESSES,
  ERC20_ABI,
} from "@/lib/contracts";

const FROM_TOKENS = ["USDC", "EURC"];
const TO_TOKENS = ["BRLA", "MXNB", "PHPC", "JPYC", "KRW1", "EURC", "USDC"];

// Fallback rates used when the contract pair is not yet configured
const MOCK_RATES: Record<string, Record<string, number>> = {
  USDC: { BRLA: 5.87, MXNB: 17.2, PHPC: 58.4, JPYC: 149.3, KRW1: 1342.5, EURC: 0.92, USDC: 1 },
  EURC: { USDC: 1.087, BRLA: 6.38, MXNB: 18.7, PHPC: 63.5, JPYC: 162.3, KRW1: 1459.8, EURC: 1 },
};

type SwapPhase = "idle" | "approving" | "approved" | "swapping" | "success" | "error";

export default function SwapPage() {
  const { isConnected } = useAccount();
  const [fromToken, setFromToken] = useState("USDC");
  const [toToken, setToToken] = useState("BRLA");
  const [fromAmount, setFromAmount] = useState("");
  const [phase, setPhase] = useState<SwapPhase>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [swapTxHash, setSwapTxHash] = useState<`0x${string}` | undefined>();
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();

  const fromAddr = TOKEN_ADDRESSES[fromToken];
  const toAddr = TOKEN_ADDRESSES[toToken];
  const amountIn = fromAmount ? parseUnits(fromAmount, 6) : BigInt(0);

  // ── Read: getAmountOut from contract ──────────────────────
  const { data: contractOut } = useReadContract({
    address: STELFI_SWAP_ADDRESS,
    abi: STELFI_SWAP_ABI,
    functionName: "getAmountOut",
    args: [fromAddr, toAddr, amountIn > BigInt(0) ? amountIn : BigInt(1000000)],
    query: { enabled: !!fromAddr && !!toAddr && !!STELFI_SWAP_ADDRESS },
  });

  const contractAmountOut = contractOut ? (contractOut as [bigint, bigint])[0] : BigInt(0);
  const contractFee = contractOut ? (contractOut as [bigint, bigint])[1] : BigInt(0);
  const usingLiveRate = contractAmountOut > BigInt(0);

  // Displayed output amount
  let toAmount = "";
  let displayFee = "0";
  if (fromAmount && parseFloat(fromAmount) > 0) {
    if (usingLiveRate) {
      toAmount = formatUnits(contractAmountOut, 6);
      displayFee = formatUnits(contractFee, 6);
    } else {
      const mockRate = MOCK_RATES[fromToken]?.[toToken] ?? 1;
      const mockFee = parseFloat(fromAmount) * 0.003;
      toAmount = ((parseFloat(fromAmount) - mockFee) * mockRate).toFixed(4);
      displayFee = mockFee.toFixed(4);
    }
  }

  // Display rate string
  const rateDisplay = usingLiveRate
    ? `1 ${fromToken} ≈ ${(parseFloat(toAmount || "0") / parseFloat(fromAmount || "1")).toFixed(4)} ${toToken}`
    : `1 ${fromToken} = ${MOCK_RATES[fromToken]?.[toToken] ?? "—"} ${toToken}`;

  // ── Write: approve ─────────────────────────────────────────
  const { writeContractAsync: writeApprove } = useWriteContract();
  const { writeContractAsync: writeSwap } = useWriteContract();

  // ── Wait for receipts ──────────────────────────────────────
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
    query: { enabled: !!approveTxHash },
  });

  const { isSuccess: swapConfirmed } = useWaitForTransactionReceipt({
    hash: swapTxHash,
    query: { enabled: !!swapTxHash },
  });

  // Auto-advance from approved → swapping
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
    }
  }, [swapConfirmed, phase]);

  function handleSwapDirection() {
    const tmp = fromToken;
    setFromToken(TO_TOKENS.includes(toToken) && FROM_TOKENS.includes(toToken) ? toToken : toToken);
    setToToken(tmp);
    setFromAmount("");
    setPhase("idle");
  }

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
      setPhase("error");
      const err = e as { shortMessage?: string; message?: string };
      setErrorMsg(err?.shortMessage || err?.message || "Approval failed");
    }
  }

  async function executeSwap() {
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
      setPhase("error");
      const err = e as { shortMessage?: string; message?: string };
      setErrorMsg(err?.shortMessage || err?.message || "Swap failed");
    }
  }

  function reset() {
    setPhase("idle");
    setErrorMsg("");
    setFromAmount("");
    setApproveTxHash(undefined);
    setSwapTxHash(undefined);
  }

  const isLoading = phase === "approving" || phase === "approved" || phase === "swapping";

  return (
    <div className="flex flex-col items-center px-6 pt-12 pb-16">
      {/* Page header */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-white">Stelfi Swap</h1>
          <NetworkBadge />
        </div>
        <p className="text-sm" style={{ color: "#00D4AA" }}>
          Exchange stablecoins instantly on Arc Network
        </p>
      </div>

      {/* Swap card */}
      <div
        className="w-full max-w-lg rounded-2xl border p-6 flex flex-col gap-4"
        style={{ backgroundColor: "#1A2340", borderColor: "#1E2D4A" }}
      >
        {/* FROM */}
        <div>
          <label className="text-xs font-medium mb-2 block" style={{ color: "#8B9EC7" }}>
            From
          </label>
          <div
            className="flex gap-3 rounded-xl p-4"
            style={{ backgroundColor: "#0A0F1E", border: "1px solid #1E2D4A" }}
          >
            <select
              value={fromToken}
              onChange={(e) => { setFromToken(e.target.value); setPhase("idle"); }}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-white outline-none cursor-pointer"
              style={{ backgroundColor: "#1A2340", border: "1px solid #1E2D4A" }}
            >
              {FROM_TOKENS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              type="number"
              placeholder="0.00"
              value={fromAmount}
              onChange={(e) => { setFromAmount(e.target.value); setPhase("idle"); }}
              className="flex-1 bg-transparent text-right text-2xl font-semibold text-white outline-none placeholder:text-gray-600"
              min="0"
              disabled={isLoading}
            />
          </div>
          <p className="text-xs mt-1 text-right" style={{ color: "#8B9EC7" }}>
            Balance: {isConnected ? "—" : "Connect wallet"}
          </p>
        </div>

        {/* Swap direction */}
        <div className="flex justify-center">
          <button
            onClick={handleSwapDirection}
            disabled={isLoading}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:rotate-180 duration-300 disabled:opacity-40"
            style={{ backgroundColor: "#0A0F1E", border: "1px solid #1E2D4A", color: "#8B9EC7" }}
          >
            ↕
          </button>
        </div>

        {/* TO */}
        <div>
          <label className="text-xs font-medium mb-2 block" style={{ color: "#8B9EC7" }}>
            To
          </label>
          <div
            className="flex gap-3 rounded-xl p-4"
            style={{ backgroundColor: "#0A0F1E", border: "1px solid #1E2D4A" }}
          >
            <select
              value={toToken}
              onChange={(e) => { setToToken(e.target.value); setPhase("idle"); }}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-white outline-none cursor-pointer"
              style={{ backgroundColor: "#1A2340", border: "1px solid #1E2D4A" }}
            >
              {TO_TOKENS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              type="number"
              readOnly
              value={toAmount}
              placeholder="0.00"
              className="flex-1 bg-transparent text-right text-2xl font-semibold outline-none cursor-default"
              style={{ color: toAmount ? "#00D4AA" : "#4B5563" }}
            />
          </div>
        </div>

        {/* Rate info */}
        <div
          className="rounded-xl p-4 flex flex-col gap-1.5 text-xs"
          style={{ backgroundColor: "#0A0F1E", border: "1px solid #1E2D4A", color: "#8B9EC7" }}
        >
          <div className="flex justify-between">
            <span>Rate</span>
            <span className="text-white">{rateDisplay}</span>
          </div>
          <div className="flex justify-between">
            <span>Fee (0.3%)</span>
            <span className="text-white">{displayFee} {fromToken}</span>
          </div>
          <div className="flex justify-between">
            <span>Source</span>
            <span className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ backgroundColor: usingLiveRate ? "#00D4AA" : "#8B9EC7" }}
              />
              {usingLiveRate ? (
                <span style={{ color: "#00D4AA" }}>Live rate from contract</span>
              ) : (
                <span>Mock rate (pair not configured)</span>
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Network</span>
            <span style={{ color: "#00D4AA" }}>Arc Testnet</span>
          </div>
        </div>

        {/* Swap button */}
        {isConnected ? (
          <button
            onClick={phase === "error" ? reset : handleSwapClick}
            disabled={isLoading || (!fromAmount && phase !== "error")}
            className="w-full rounded-xl font-bold text-base transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ height: "52px", backgroundColor: phase === "error" ? "#1A2340" : "#00D4AA", color: phase === "error" ? "#8B9EC7" : "#0A0F1E", border: phase === "error" ? "1px solid #1E2D4A" : "none" }}
          >
            {phase === "approving" && <><span className="animate-spin inline-block">⟳</span> Step 1/2: Approving {fromToken}...</>}
            {phase === "approved" && <><span className="animate-spin inline-block">⟳</span> Preparing swap...</>}
            {phase === "swapping" && <><span className="animate-spin inline-block">⟳</span> Step 2/2: Executing swap...</>}
            {phase === "error" && "↩ Try Again"}
            {(phase === "idle" || phase === "success") && "Swap Now"}
          </button>
        ) : (
          <div className="flex justify-center">
            <ConnectButton label="Connect Wallet to Swap" />
          </div>
        )}

        {/* Status messages */}
        {phase === "success" && swapTxHash && (
          <div
            className="rounded-xl p-4 flex flex-col gap-2 text-sm"
            style={{ backgroundColor: "#00D4AA11", border: "1px solid #00D4AA44" }}
          >
            <div className="flex items-center gap-2 font-semibold" style={{ color: "#00D4AA" }}>
              <span>✓</span> Swap successful!
            </div>
            <p style={{ color: "#8B9EC7" }}>
              Tx: {swapTxHash.slice(0, 10)}...{swapTxHash.slice(-8)}{" "}
              <a
                href={`https://testnet.arcscan.app/tx/${swapTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white"
                style={{ color: "#00D4AA" }}
              >
                View on ArcScan →
              </a>
            </p>
            <button onClick={reset} className="text-xs underline text-left mt-1" style={{ color: "#8B9EC7" }}>
              Make another swap
            </button>
          </div>
        )}

        {phase === "error" && (
          <div
            className="rounded-xl p-4 flex flex-col gap-1 text-sm"
            style={{ backgroundColor: "#FF4D6D11", border: "1px solid #FF4D6D44", color: "#FF4D6D" }}
          >
            <div className="flex items-center gap-2">
              <span>✕</span> {errorMsg || "Transaction failed."}
            </div>
          </div>
        )}
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
