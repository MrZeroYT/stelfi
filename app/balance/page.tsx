"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useAccount, useBalance } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatUnits } from "viem";
import {
  pageVariants,
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

const ARC_USDC = (process.env.NEXT_PUBLIC_ARC_USDC || "0x3600000000000000000000000000000000000000") as `0x${string}`;

function formatBalance(val: bigint | undefined, dec: number): string {
  if (val === undefined) return "--";
  const n = parseFloat(formatUnits(val, dec));
  if (n === 0) return "0.00";
  if (n < 0.01) return "< 0.01";
  return n.toFixed(2);
}

function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

type OpStatus = "idle" | "loading" | "success" | "error";

export default function BalancePage() {
  const { address, isConnected } = useAccount();

  // Arc balance
  const { data: arcBalance } = useBalance({
    address,
    token: ARC_USDC,
    chainId: 5042002,
    query: { enabled: !!address, refetchInterval: 15000 },
  });

  // Deposit state
  const [depositChain,  setDepositChain]  = useState<BridgeChain>(BRIDGE_SOURCE_CHAINS[0].id);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositStatus, setDepositStatus] = useState<OpStatus>("idle");
  const [depositHash,   setDepositHash]   = useState("");
  const [depositError,  setDepositError]  = useState("");

  // Spend state
  const [spendAmount,    setSpendAmount]    = useState("");
  const [spendRecipient, setSpendRecipient] = useState("");
  const [spendStatus,    setSpendStatus]    = useState<OpStatus>("idle");
  const [spendHash,      setSpendHash]      = useState("");
  const [spendError,     setSpendError]     = useState("");

  const spendAddressValid   = spendRecipient.length > 0 && isValidAddress(spendRecipient);
  const spendAddressInvalid = spendRecipient.length > 0 && !isValidAddress(spendRecipient);

  // ── Deposit handler ───────────────────────────────────────────
  const handleDeposit = useCallback(async () => {
    if (!address || !depositAmount || parseFloat(depositAmount) <= 0) return;
    setDepositStatus("loading");
    setDepositError("");
    try {
      const adapter = await createBrowserAdapter();
      if (!adapter) throw new Error("No wallet connected");
      const kit = getAppKit();

      // Gateway deposit: bridge from source to Arc (unified balance)
      const result = await kit.bridge({
        from:   { adapter, chain: depositChain },
        to:     { adapter, chain: BridgeChain.Arc_Testnet },
        amount: depositAmount,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hash = (result as any)?.transactionHash || (result as any)?.txHash || "";
      setDepositHash(hash);
      setDepositStatus("success");
    } catch (err: unknown) {
      const e = err as { message?: string; shortMessage?: string };
      setDepositStatus("error");
      setDepositError(e?.shortMessage || e?.message || "Deposit failed.");
    }
  }, [address, depositAmount, depositChain]);

  // ── Spend handler ─────────────────────────────────────────────
  const handleSpend = useCallback(async () => {
    if (!address || !spendAmount || !spendAddressValid) return;
    setSpendStatus("loading");
    setSpendError("");
    try {
      const adapter = await createBrowserAdapter();
      if (!adapter) throw new Error("No wallet connected");
      const kit = getAppKit();

      const result = await kit.send({
        from:   { adapter, chain: BridgeChain.Arc_Testnet },
        to:     spendRecipient as `0x${string}`,
        token:  "USDC",
        amount: spendAmount,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hash = (result as any)?.transactionHash || (result as any)?.txHash || "";
      setSpendHash(hash);
      setSpendStatus("success");
    } catch (err: unknown) {
      const e = err as { message?: string; shortMessage?: string };
      setSpendStatus("error");
      setSpendError(e?.shortMessage || e?.message || "Spend failed.");
    }
  }, [address, spendAmount, spendRecipient, spendAddressValid]);

  const depositLoading = depositStatus === "loading";
  const spendLoading   = spendStatus === "loading";

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen pt-28 pb-20 px-4"
      style={{ position: "relative", zIndex: 1 }}
    >
      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <motion.div variants={fadeUpVariants} className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <h1 className="text-3xl font-black text-white">Unified Balance</h1>
            <NetworkBadge />
          </div>
          <p className="text-sm mb-3" style={{ color: "#8B9EC7" }}>
            Pool USDC from multiple chains into one instantly spendable balance on Arc Network
          </p>
          <span
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border"
            style={{ color: "#00D4AA", borderColor: "rgba(0,212,170,0.3)", backgroundColor: "rgba(0,212,170,0.08)" }}
          >
            Powered by Circle Gateway
          </span>
        </motion.div>

        {/* ── Explainer banner ── */}
        <motion.div
          variants={fadeUpVariants}
          className="glass-card p-5 mb-8 max-w-2xl mx-auto flex gap-4 items-start"
          style={{ border: "1px solid rgba(0,212,170,0.15)" }}
        >
          <span className="text-2xl flex-shrink-0">⚡</span>
          <p className="text-sm leading-relaxed" style={{ color: "#8B9EC7" }}>
            Unified Balance lets you combine USDC from Ethereum, Base, Arbitrum, and other chains
            into a single balance that you can spend instantly on Arc —{" "}
            <span style={{ color: "#ffffff" }}>without waiting for each bridge to complete separately.</span>
          </p>
        </motion.div>

        {/* ── Your Unified Balance card ── */}
        <motion.div
          variants={scaleInVariants}
          className="glass-card p-8 max-w-2xl mx-auto mb-10 text-center"
          style={{ border: "1px solid rgba(0,212,170,0.2)", boxShadow: "0 0 40px rgba(0,212,170,0.06)" }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#8B9EC7" }}>
            Your Unified Balance
          </p>
          {isConnected ? (
            <>
              <div className="text-5xl font-black mb-2" style={{ color: "#00D4AA" }}>
                {formatBalance(arcBalance?.value, 6)}
              </div>
              <p className="text-sm mb-6" style={{ color: "#8B9EC7" }}>USDC available on Arc Testnet</p>
              <div className="flex flex-col gap-2 text-xs max-w-xs mx-auto">
                <div className="flex justify-between" style={{ color: "#4A5568" }}>
                  <span>● Arc Testnet</span>
                  <span style={{ color: "#8B9EC7" }}>{formatBalance(arcBalance?.value, 6)} USDC</span>
                </div>
                <div className="flex justify-between" style={{ color: "#4A5568" }}>
                  <span>● Other chains</span>
                  <span>Connect source wallets</span>
                </div>
              </div>
            </>
          ) : (
            <div className="py-4">
              <p className="mb-4" style={{ color: "#8B9EC7" }}>Connect wallet to view your Unified Balance</p>
              <ConnectButton />
            </div>
          )}
        </motion.div>

        {/* ── Two-column: Deposit + Spend ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">

          {/* Deposit */}
          <motion.div variants={fadeUpVariants} initial="initial" whileInView="animate" viewport={{ once: true }} className="glass-card p-7">
            <h2 className="text-lg font-black text-white mb-5">Deposit into Unified Balance</h2>

            {/* Chain selector */}
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#8B9EC7" }}>Source Chain</label>
              <div className="grid grid-cols-3 gap-2">
                {BRIDGE_SOURCE_CHAINS.map((chain) => (
                  <button
                    key={chain.id}
                    type="button"
                    onClick={() => setDepositChain(chain.id)}
                    disabled={depositLoading}
                    style={{
                      padding: "8px 4px",
                      borderRadius: "10px",
                      border: depositChain === chain.id ? `1px solid ${chain.color}60` : "1px solid rgba(255,255,255,0.08)",
                      background: depositChain === chain.id ? `${chain.color}15` : "rgba(255,255,255,0.03)",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: depositChain === chain.id ? chain.color : "#8B9EC7",
                      transition: "all 0.2s",
                    }}
                  >
                    {chain.icon} {chain.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#8B9EC7" }}>Amount (USDC)</label>
              <input
                type="number"
                placeholder="0.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                disabled={depositLoading}
                min="0"
                style={{ width: "100%", padding: "12px 14px", fontSize: "18px", fontWeight: 600, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", color: "#ffffff", outline: "none" }}
                className="placeholder:text-gray-700"
              />
            </div>

            {depositStatus === "success" ? (
              <div className="rounded-xl p-4 text-sm" style={{ background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.3)", color: "#00D4AA" }}>
                ✓ Deposit initiated!{" "}
                {depositHash && <a href={`https://testnet.arcscan.app/tx/${depositHash}`} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#00D4AA" }}>View →</a>}
              </div>
            ) : depositStatus === "error" ? (
              <div className="rounded-xl p-3 text-sm" style={{ background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.3)", color: "#FF4D6D" }}>✕ {depositError}</div>
            ) : isConnected ? (
              <motion.button
                onClick={handleDeposit}
                disabled={depositLoading || !depositAmount || parseFloat(depositAmount) <= 0}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary w-full flex items-center justify-center gap-2"
                style={{ height: "48px", background: "linear-gradient(135deg,#00D4AA,#00B8A0)", color: "#050A14" }}
              >
                {depositLoading ? <><span className="animate-spin">⟳</span> Depositing…</> : "Deposit →"}
              </motion.button>
            ) : (
              <div className="flex justify-center"><ConnectButton label="Connect to Deposit" /></div>
            )}
          </motion.div>

          {/* Spend */}
          <motion.div variants={fadeUpVariants} initial="initial" whileInView="animate" viewport={{ once: true }} className="glass-card p-7">
            <h2 className="text-lg font-black text-white mb-5">Spend from Unified Balance</h2>

            {/* Amount */}
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#8B9EC7" }}>Amount to Spend (USDC)</label>
              <input
                type="number"
                placeholder="0.00"
                value={spendAmount}
                onChange={(e) => setSpendAmount(e.target.value)}
                disabled={spendLoading}
                min="0"
                style={{ width: "100%", padding: "12px 14px", fontSize: "18px", fontWeight: 600, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", color: "#ffffff", outline: "none" }}
                className="placeholder:text-gray-700"
              />
              <p className="text-xs mt-1" style={{ color: "#4A5568" }}>From your Unified Balance on Arc Testnet</p>
            </div>

            {/* Recipient */}
            <div className="mb-5">
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#8B9EC7" }}>Recipient on Arc Testnet</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="0x…"
                  value={spendRecipient}
                  onChange={(e) => setSpendRecipient(e.target.value.trim())}
                  disabled={spendLoading}
                  style={{
                    width: "100%",
                    padding: "12px 36px 12px 14px",
                    fontSize: "13px",
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${spendAddressInvalid ? "rgba(255,77,109,0.5)" : spendAddressValid ? "rgba(0,212,170,0.4)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: "12px",
                    color: "#ffffff",
                    outline: "none",
                    fontFamily: "monospace",
                  }}
                />
                {spendRecipient.length > 0 && (
                  <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: spendAddressValid ? "#00D4AA" : "#FF4D6D" }}>
                    {spendAddressValid ? "✓" : "✕"}
                  </span>
                )}
              </div>
            </div>

            {spendStatus === "success" ? (
              <div className="rounded-xl p-4 text-sm" style={{ background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.3)", color: "#00D4AA" }}>
                ✓ Spent {spendAmount} USDC!{" "}
                {spendHash && <a href={`https://testnet.arcscan.app/tx/${spendHash}`} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#00D4AA" }}>View →</a>}
              </div>
            ) : spendStatus === "error" ? (
              <div className="rounded-xl p-3 text-sm" style={{ background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.3)", color: "#FF4D6D" }}>✕ {spendError}</div>
            ) : isConnected ? (
              <motion.button
                onClick={handleSpend}
                disabled={spendLoading || !spendAmount || !spendAddressValid}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary w-full flex items-center justify-center gap-2"
                style={{
                  height: "48px",
                  background: spendAmount && spendAddressValid ? "linear-gradient(135deg,#00D4AA,#00B8A0)" : "rgba(255,255,255,0.06)",
                  color: spendAmount && spendAddressValid ? "#050A14" : "#4A5568",
                }}
              >
                {spendLoading ? <><span className="animate-spin">⟳</span> Spending…</> : spendAmount ? `Spend ${spendAmount} USDC →` : "Spend from Unified Balance"}
              </motion.button>
            ) : (
              <div className="flex justify-center"><ConnectButton label="Connect to Spend" /></div>
            )}
          </motion.div>
        </div>

        {/* ── How it works ── */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.2 }}
          className="mb-16"
        >
          <motion.h2 variants={staggerItem} className="text-xl font-black text-white text-center mb-6">
            How Unified Balance Works
          </motion.h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { num: "1", icon: "📥", title: "Deposit",   body: "Send USDC from any supported chain into your Unified Balance pool" },
              { num: "2", icon: "⚡", title: "Aggregate", body: "Circle Gateway combines your deposits from multiple chains automatically" },
              { num: "3", icon: "💸", title: "Spend",     body: "Use your full balance instantly on Arc regardless of which chain it came from" },
              { num: "4", icon: "✅", title: "Settle",    body: "Transactions settle in under 1 second on Arc with USDC gas fees" },
            ].map((step) => (
              <motion.div key={step.num} variants={staggerItem} className="glass-card p-5 text-center flex flex-col items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "rgba(0,212,170,0.15)", color: "#00D4AA", border: "1px solid rgba(0,212,170,0.3)" }}>
                  {step.num}
                </div>
                <div className="text-xl">{step.icon}</div>
                <h3 className="text-sm font-bold text-white">{step.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#8B9EC7" }}>{step.body}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Use cases ── */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.h2 variants={staggerItem} className="text-xl font-black text-white text-center mb-6">
            Use Cases
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: "👛", title: "Pay anyone on Arc",              body: "Send USDC instantly to any wallet on Arc Testnet from your unified pool" },
              { icon: "📊", title: "Fund prediction market bets",    body: "Bet on outcomes with USDC pooled from your wallets across any chain" },
              { icon: "🔄", title: "Top up your swap liquidity",     body: "Keep a ready balance for Stelfi Swap without constant bridging" },
            ].map((uc) => (
              <motion.div key={uc.title} variants={staggerItem} className="glass-card p-6 flex flex-col gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: "rgba(0,212,170,0.1)" }}>
                  {uc.icon}
                </div>
                <h3 className="text-sm font-bold text-white">{uc.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#8B9EC7" }}>{uc.body}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

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
