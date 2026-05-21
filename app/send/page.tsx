"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useBalance } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatUnits } from "viem";
import {
  fadeUpVariants,
  scaleInVariants,
} from "@/lib/animations";
import { getAppKit, createBrowserAdapter, BridgeChain } from "@/lib/appkit";

const ARC_USDC = (process.env.NEXT_PUBLIC_ARC_USDC || "0x3600000000000000000000000000000000000000") as `0x${string}`;

function formatBalance(val: bigint | undefined, dec: number): string {
  if (val === undefined) return "--";
  const n = parseFloat(formatUnits(val, dec));
  if (n === 0) return "0.00";
  if (n < 0.01) return "< 0.01";
  if (n < 1000) return n.toFixed(2);
  return (n / 1000).toFixed(2) + "K";
}

function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

type SendStatus = "idle" | "loading" | "success" | "error";

export default function SendPage() {
  const { address, isConnected } = useAccount();

  const [amountIn,    setAmountIn]    = useState("");
  const [recipient,   setRecipient]   = useState("");
  const [sendStatus,  setSendStatus]  = useState<SendStatus>("idle");
  const [txHash,      setTxHash]      = useState<string>("");
  const [txError,     setTxError]     = useState<string>("");

  const { data: balance, refetch: refetchBalance } = useBalance({
    address,
    token: ARC_USDC,
    chainId: 5042002,
    query: { enabled: !!address, refetchInterval: 15000 },
  });

  const formattedBalance = formatBalance(balance?.value, 6);
  const addressValid     = recipient.length > 0 && isValidAddress(recipient);
  const addressInvalid   = recipient.length > 0 && !isValidAddress(recipient);
  const amountValid      = amountIn.length > 0 && parseFloat(amountIn) > 0;
  const canSend          = addressValid && amountValid;

  function handleMax() {
    if (!balance?.value) return;
    const val = parseFloat(formatUnits(balance.value, 6));
    setAmountIn(Math.max(0, val - 0.01).toFixed(6));
  }

  const handleSend = useCallback(async () => {
    if (!address || !canSend) return;
    setSendStatus("loading");
    setTxError("");

    try {
      const adapter = await createBrowserAdapter();
      if (!adapter) throw new Error("No wallet connected");

      const kit = getAppKit();

      const result = await kit.send({
        from:   { adapter, chain: BridgeChain.Arc_Testnet },
        to:     recipient as `0x${string}`,
        token:  "USDC",
        amount: amountIn,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hash = (result as any)?.transactionHash || (result as any)?.txHash || "";
      setTxHash(hash);
      setSendStatus("success");
      refetchBalance();
    } catch (err: unknown) {
      const e = err as { message?: string; shortMessage?: string };
      setSendStatus("error");
      setTxError(e?.shortMessage || e?.message || "Send failed. Please try again.");
    }
  }, [address, amountIn, recipient, canSend, refetchBalance]);

  function reset() {
    setSendStatus("idle");
    setAmountIn("");
    setRecipient("");
    setTxHash("");
    setTxError("");
  }

  const isLoading   = sendStatus === "loading";
  const truncRecip  = recipient ? `${recipient.slice(0, 8)}…${recipient.slice(-6)}` : "";

  return (
    <div className="min-h-screen pt-8 pb-20 px-4" style={{ position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: "480px", width: "100%", margin: "0 auto" }}>

        {/* ── Header ── */}
        <motion.div variants={fadeUpVariants} className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <h1 className="text-3xl font-black text-white">Stelfi Send</h1>
            <NetworkBadge />
          </div>
          <p className="text-sm" style={{ color: "#8B9EC7" }}>
            Send USDC to any wallet on Arc Network instantly
          </p>
        </motion.div>

        {/* ── Send card ── */}
        <motion.div variants={scaleInVariants} className="glass-card mb-6" style={{ padding: "28px" }}>

          {/* Amount section */}
          <div className="mb-5">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#8B9EC7", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                You Send
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {isConnected && (
                  <span style={{ fontSize: "12px", color: "#8B9EC7" }}>
                    Balance: <span style={{ color: "#00D4AA" }}>{formattedBalance} USDC</span>
                  </span>
                )}
                {isConnected && balance && balance.value > BigInt(0) && (
                  <button onClick={handleMax} className="balance-badge" style={{ fontSize: "11px", padding: "2px 8px" }}>
                    MAX
                  </button>
                )}
              </div>
            </div>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#2775CA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#fff" }}>$</div>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#fff" }}>USDC</span>
              </div>
              <input
                type="number"
                placeholder="0.00"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
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
                }}
                className="placeholder:text-gray-700"
              />
            </div>
          </div>

          {/* Network indicator */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <span style={{ fontSize: "12px", color: "#4A5568" }}>Sending on</span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 10px",
                borderRadius: "20px",
                background: "rgba(0,212,170,0.08)",
                border: "1px solid rgba(0,212,170,0.2)",
                fontSize: "12px",
                fontWeight: 700,
                color: "#00D4AA",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              Arc Testnet
            </span>
          </div>

          {/* Recipient section */}
          <div className="mb-5">
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#8B9EC7", textTransform: "uppercase", letterSpacing: "0.8px", display: "block", marginBottom: "8px" }}>
              To Wallet
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="0x… wallet address"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value.trim())}
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: "14px 40px 14px 14px",
                  fontSize: "14px",
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${addressInvalid ? "rgba(255,77,109,0.5)" : addressValid ? "rgba(0,212,170,0.4)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: "14px",
                  color: "#ffffff",
                  outline: "none",
                  fontFamily: "monospace",
                  transition: "all 0.2s ease",
                }}
              />
              {recipient.length > 0 && (
                <span style={{
                  position: "absolute",
                  right: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "16px",
                  color: addressValid ? "#00D4AA" : "#FF4D6D",
                }}>
                  {addressValid ? "✓" : "✕"}
                </span>
              )}
            </div>
            <AnimatePresence>
              {addressInvalid && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  style={{ fontSize: "12px", color: "#FF4D6D", marginTop: "6px" }}
                >
                  Invalid address — must be 0x followed by 40 hex characters
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Summary box */}
          <AnimatePresence>
            {canSend && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="rounded-xl mb-5 text-xs flex flex-col gap-2"
                style={{ padding: "14px 16px", background: "rgba(0,212,170,0.04)", border: "1px solid rgba(0,212,170,0.15)" }}
              >
                {[
                  ["You send",    `${amountIn} USDC`],
                  ["Recipient",   truncRecip],
                  ["Network",     "Arc Testnet"],
                  ["Gas",         "~0.01 USDC (estimated)"],
                  ["They receive",`${amountIn} USDC`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span style={{ color: "#8B9EC7" }}>{k}</span>
                    <span style={{ color: "#ffffff", fontFamily: k === "Recipient" ? "monospace" : undefined }}>{v}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Send button */}
          {isConnected ? (
            sendStatus === "success" ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-xl p-4 flex items-center gap-3 text-sm" style={{ background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.3)" }}>
                  <span style={{ color: "#00D4AA", fontSize: "20px" }}>✓</span>
                  <div>
                    <p style={{ color: "#00D4AA", fontWeight: 700 }}>Sent Successfully!</p>
                    <p style={{ color: "#8B9EC7" }}>To: {truncRecip}</p>
                    {txHash && (
                      <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="underline text-xs" style={{ color: "#00D4AA" }}>
                        View on ArcScan →
                      </a>
                    )}
                  </div>
                </div>
                <button onClick={reset} className="btn-primary w-full flex items-center justify-center" style={{ height: "48px", background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.3)", color: "#00D4AA" }}>
                  Send Again
                </button>
              </div>
            ) : sendStatus === "error" ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-xl p-3 text-sm" style={{ background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.3)", color: "#FF4D6D" }}>
                  ✕ {txError}
                </div>
                <button onClick={reset} className="btn-primary w-full" style={{ height: "48px", background: "rgba(255,255,255,0.06)", color: "#8B9EC7" }}>
                  Try Again
                </button>
              </div>
            ) : (
              <motion.button
                onClick={handleSend}
                disabled={isLoading || !canSend}
                whileHover={canSend && !isLoading ? { scale: 1.02 } : {}}
                whileTap={canSend && !isLoading ? { scale: 0.98 } : {}}
                className="btn-primary w-full flex items-center justify-center gap-2"
                style={{
                  height: "52px",
                  background: canSend ? "linear-gradient(135deg,#00D4AA,#00B8A0)" : "rgba(255,255,255,0.06)",
                  color: canSend ? "#050A14" : "#4A5568",
                  cursor: canSend ? "pointer" : "not-allowed",
                }}
              >
                {isLoading ? (
                  <><span className="animate-spin">⟳</span> Sending…</>
                ) : !amountValid || !addressValid ? (
                  "Enter amount and address"
                ) : (
                  `Send ${amountIn} USDC →`
                )}
              </motion.button>
            )
          ) : (
            <div className="flex justify-center">
              <ConnectButton label="Connect Wallet to Send" />
            </div>
          )}
        </motion.div>

        {/* ── Recent sends placeholder ── */}
        <motion.div
          variants={fadeUpVariants}
          className="glass-card p-6 text-center"
          style={{ border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p style={{ color: "#4A5568", fontSize: "14px" }}>
            Your recent sends will appear here during this session
          </p>
        </motion.div>

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
