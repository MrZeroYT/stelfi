"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  fadeUpVariants,
  scaleInVariants,
  staggerContainer,
  staggerItem,
} from "@/lib/animations";
import {
  getAppKit,
  createBrowserAdapter,
  BridgeChain,
  BRIDGE_SOURCE_CHAINS,
} from "@/lib/appkit";

type BridgeStatus = "idle" | "loading" | "success" | "error";

export default function BridgePage() {
  const { address, isConnected } = useAccount();

  const [selectedChain, setSelectedChain] = useState<BridgeChain>(BRIDGE_SOURCE_CHAINS[0].id);
  const [amountIn,      setAmountIn]      = useState("");
  const [bridgeStatus,  setBridgeStatus]  = useState<BridgeStatus>("idle");
  const [txHash,        setTxHash]        = useState<string>("");
  const [txError,       setTxError]       = useState<string>("");

  const selectedChainInfo = BRIDGE_SOURCE_CHAINS.find((c) => c.id === selectedChain) ?? BRIDGE_SOURCE_CHAINS[0];

  const handleBridge = useCallback(async () => {
    if (!address || !amountIn || parseFloat(amountIn) <= 0) return;
    setBridgeStatus("loading");
    setTxError("");

    try {
      const adapter = await createBrowserAdapter();
      if (!adapter) throw new Error("No wallet connected");

      const kit = getAppKit();

      const result = await kit.bridge({
        from:   { adapter, chain: selectedChain },
        to:     { adapter, chain: BridgeChain.Arc_Testnet },
        amount: amountIn,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hash = (result as any)?.transactionHash || (result as any)?.txHash || "";
      setTxHash(hash);
      setBridgeStatus("success");
    } catch (err: unknown) {
      const e = err as { message?: string; shortMessage?: string };
      setBridgeStatus("error");
      setTxError(e?.shortMessage || e?.message || "Bridge failed. Please try again.");
    }
  }, [address, amountIn, selectedChain]);

  function reset() {
    setBridgeStatus("idle");
    setAmountIn("");
    setTxHash("");
    setTxError("");
  }

  const isLoading = bridgeStatus === "loading";

  return (
    <div className="min-h-screen pt-8 pb-20" style={{ position: "relative", zIndex: 1 }}>
      <div className="max-w-2xl mx-auto">

        {/* ── Header ── */}
        <motion.div variants={fadeUpVariants} className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <h1 className="text-3xl font-black text-white">Stelfi Bridge</h1>
            <NetworkBadge />
          </div>
          <p className="text-sm" style={{ color: "#8B9EC7" }}>
            Move USDC to Arc Network from any chain — in under 30 seconds
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
              style={{ color: "#00D4AA", borderColor: "rgba(0,212,170,0.3)", backgroundColor: "rgba(0,212,170,0.08)" }}
            >
              Powered by Circle CCTP
            </span>
          </div>
        </motion.div>

        {/* ── Info Banner ── */}
        <motion.div
          variants={fadeUpVariants}
          className="glass-card p-5 mb-8 flex gap-4 items-start"
          style={{ border: "1px solid rgba(0,212,170,0.15)" }}
        >
          <span className="text-2xl flex-shrink-0">🔐</span>
          <p className="text-sm leading-relaxed" style={{ color: "#8B9EC7" }}>
            Bridge uses Circle&apos;s Cross-Chain Transfer Protocol (CCTP) — the most secure cross-chain
            USDC standard. Your USDC is burned on the source chain and minted natively on Arc.{" "}
            <span style={{ color: "#ffffff" }}>No wrapped tokens. No bridge risk.</span>
          </p>
        </motion.div>

        {/* ── Bridge Card ── */}
        <motion.div variants={scaleInVariants} className="glass-card mb-10" style={{ padding: "28px" }}>

          {/* FROM chain */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#8B9EC7" }}>
              From Chain
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BRIDGE_SOURCE_CHAINS.map((chain) => (
                <button
                  key={chain.id}
                  type="button"
                  onClick={() => setSelectedChain(chain.id)}
                  disabled={isLoading}
                  style={{
                    padding: "10px 8px",
                    borderRadius: "12px",
                    border: selectedChain === chain.id
                      ? `1px solid ${chain.color}60`
                      : "1px solid rgba(255,255,255,0.08)",
                    background: selectedChain === chain.id
                      ? `${chain.color}15`
                      : "rgba(255,255,255,0.03)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span style={{ fontSize: "18px" }}>{chain.icon}</span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: selectedChain === chain.id ? chain.color : "#8B9EC7", textAlign: "center" }}>
                    {chain.name.split(" ")[0]}
                  </span>
                  <span
                    style={{ fontSize: "9px", padding: "1px 6px", borderRadius: "10px", background: "rgba(255,255,255,0.06)", color: "#4A5568" }}
                  >
                    Testnet
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Token display (locked to USDC) */}
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#8B9EC7" }}>
              Token
            </label>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "10px",
                background: "rgba(39,117,202,0.1)",
                border: "1px solid rgba(39,117,202,0.3)",
              }}
            >
              <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#2775CA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "#fff" }}>$</div>
              <span style={{ fontWeight: 700, color: "#fff", fontSize: "14px" }}>USDC</span>
              <span style={{ fontSize: "11px", color: "#8B9EC7" }}>locked</span>
            </div>
          </div>

          {/* Amount input */}
          <div className="mb-5">
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#8B9EC7" }}>
              Amount
            </label>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 14px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px",
            }}>
              <input
                type="number"
                placeholder="0.00"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                disabled={isLoading}
                min="0"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "22px",
                  fontWeight: 600,
                  color: "#ffffff",
                }}
                className="placeholder:text-gray-700"
              />
              <span style={{ color: "#8B9EC7", fontSize: "14px", fontWeight: 600 }}>USDC</span>
            </div>
          </div>

          {/* Direction indicator */}
          <div className="flex items-center justify-center gap-3 mb-5 py-2">
            <span className="text-sm font-semibold" style={{ color: "#8B9EC7" }}>{selectedChainInfo.name}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "20px", background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.2)" }}>
              <span style={{ color: "#00D4AA", fontSize: "14px" }}>→</span>
              <span style={{ color: "#00D4AA", fontSize: "12px", fontWeight: 700 }}>Arc Testnet</span>
            </div>
          </div>

          {/* Fee info */}
          <div
            className="rounded-xl mb-5 text-xs flex flex-col gap-2"
            style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {[
              ["Bridge Fee",   "~0.00 USDC (free on testnet)"],
              ["Settlement",   "< 30 seconds via CCTP"],
              ["Protocol",     "Circle CCTP v2"],
              ["Security",     "Native burn & mint — no wrapped tokens"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span style={{ color: "#8B9EC7" }}>{k}</span>
                <span className="text-white">{v}</span>
              </div>
            ))}
          </div>

          {/* Bridge button */}
          {isConnected ? (
            bridgeStatus === "success" ? (
              <div className="flex flex-col gap-3">
                <div
                  className="rounded-xl p-4 flex items-center gap-3 text-sm"
                  style={{ background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.3)" }}
                >
                  <span style={{ color: "#00D4AA", fontSize: "20px" }}>✓</span>
                  <div>
                    <p style={{ color: "#00D4AA", fontWeight: 700 }}>Bridge Complete!</p>
                    <p style={{ color: "#8B9EC7" }}>USDC is now on Arc Testnet</p>
                    {txHash && (
                      <a
                        href={`https://testnet.arcscan.app/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-xs"
                        style={{ color: "#00D4AA" }}
                      >
                        View on ArcScan →
                      </a>
                    )}
                  </div>
                </div>
                <button onClick={reset} className="btn-primary w-full flex items-center justify-center" style={{ height: "48px", background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.3)", color: "#00D4AA" }}>
                  Bridge Again
                </button>
              </div>
            ) : bridgeStatus === "error" ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-xl p-3 text-sm" style={{ background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.3)", color: "#FF4D6D" }}>
                  ✕ {txError}
                </div>
                <button onClick={reset} className="btn-primary w-full flex items-center justify-center" style={{ height: "48px", background: "rgba(255,255,255,0.06)", color: "#8B9EC7" }}>
                  Try Again
                </button>
              </div>
            ) : (
              <motion.button
                onClick={handleBridge}
                disabled={isLoading || !amountIn || parseFloat(amountIn) <= 0}
                whileHover={!isLoading ? { scale: 1.02 } : {}}
                whileTap={!isLoading ? { scale: 0.98 } : {}}
                className="btn-primary w-full flex items-center justify-center gap-2"
                style={{ height: "52px", background: "linear-gradient(135deg,#00D4AA,#00B8A0)", color: "#050A14" }}
              >
                {isLoading ? (
                  <><span className="animate-spin">⟳</span> Bridging… (~30s)</>
                ) : (
                  "Bridge to Arc Testnet →"
                )}
              </motion.button>
            )
          ) : (
            <div className="flex justify-center">
              <ConnectButton label="Connect Wallet to Bridge" />
            </div>
          )}
        </motion.div>

        {/* ── How it works ── */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.h2 variants={staggerItem} className="text-xl font-black text-white text-center mb-6">
            How It Works
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { num: "1", icon: "🔥", title: "Initiate",  body: "Your USDC is burned on the source chain via Circle CCTP" },
              { num: "2", icon: "🛡",  title: "Verify",   body: "Circle attestation service verifies the burn in ~20 seconds" },
              { num: "3", icon: "✨", title: "Receive",   body: "Native USDC minted on Arc Testnet directly to your wallet" },
            ].map((step) => (
              <motion.div key={step.num} variants={staggerItem} className="glass-card p-6 text-center flex flex-col items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
                  style={{ background: "rgba(0,212,170,0.15)", color: "#00D4AA", border: "1px solid rgba(0,212,170,0.3)" }}
                >
                  {step.num}
                </div>
                <div className="text-2xl">{step.icon}</div>
                <h3 className="text-sm font-bold text-white">{step.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#8B9EC7" }}>{step.body}</p>
              </motion.div>
            ))}
          </div>
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
