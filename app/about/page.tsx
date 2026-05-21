"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  pageVariants,
  fadeUpVariants,
  staggerContainer,
  staggerItem,
  scaleInVariants,
} from "@/lib/animations";

// ── Scroll-aware count-up ─────────────────────────────────────
function StatCard({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="glass-card p-5 text-center"
    >
      <div className="text-2xl font-black mb-1" style={{ color: "#00D4AA" }}>{value}</div>
      <div className="text-xs" style={{ color: "#8B9EC7" }}>{label}</div>
    </motion.div>
  );
}

// ── Check item ────────────────────────────────────────────────
function CheckItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-sm font-bold flex-shrink-0" style={{ color: "#00D4AA" }}>✓</span>
      <span className="text-sm leading-relaxed" style={{ color: "#8B9EC7" }}>{text}</span>
    </div>
  );
}

const TECH_STACK = [
  "Next.js 14", "TypeScript", "TailwindCSS", "Solidity 0.8.20",
  "Hardhat", "wagmi v2", "RainbowKit", "viem", "OpenZeppelin",
  "Arc Network", "USDC", "Vercel",
];

export default function AboutPage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen pt-24 pb-20 px-4"
      style={{ position: "relative", zIndex: 1 }}
    >
      <div className="max-w-6xl mx-auto">

        {/* ── SECTION 1: HERO ── */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.2 }}
          className="text-center mb-24"
        >
          <motion.span
            variants={staggerItem}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border mb-8"
            style={{ color: "#00D4AA", borderColor: "rgba(0,212,170,0.3)", backgroundColor: "rgba(0,212,170,0.08)" }}
          >
            Our Story
          </motion.span>
          <motion.h1
            variants={staggerItem}
            className="text-4xl md:text-6xl font-black leading-tight mb-6 text-white"
          >
            Built for the{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #00D4AA, #00FFD1)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Future of Finance
            </span>
          </motion.h1>
          <motion.p
            variants={staggerItem}
            className="max-w-2xl mx-auto text-lg leading-relaxed"
            style={{ color: "#8B9EC7" }}
          >
            Stelfi was born from a simple belief — that stablecoin-powered finance should be
            accessible, transparent, and instant for everyone, everywhere.
          </motion.p>
        </motion.div>

        {/* ── SECTION 2: MISSION ── */}
        <motion.div
          variants={fadeUpVariants}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.2 }}
          className="mb-24"
        >
          <motion.div variants={scaleInVariants} className="glass-card p-10 md:p-14 max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-black text-white mb-8">Our Mission</h2>
            <div className="space-y-5 text-base md:text-lg leading-relaxed text-left" style={{ color: "#8B9EC7" }}>
              <p>
                Stelfi is a next-generation decentralized finance platform built on Arc Network —
                Circle&apos;s stablecoin-native Layer 1 blockchain. We set out to solve two of the most
                pressing problems in global finance: the friction and opacity of cross-border currency
                exchange, and the absence of trustless, transparent prediction markets that anyone
                can participate in.
              </p>
              <p>
                We believe that access to efficient financial tools should not be a privilege. Whether
                you are a freelancer in Lagos sending value to a client in Tokyo, or an investor in
                São Paulo making a conviction call on global markets, Stelfi gives you the infrastructure
                to act — instantly, transparently, and without unnecessary intermediaries.
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* ── SECTION 3: WHAT WE BUILT ── */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.05 }}
          className="mb-24"
        >
          <motion.h2 variants={staggerItem} className="text-2xl font-black text-white text-center mb-12">
            What We Built
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Swap card */}
            <motion.div variants={staggerItem} className="glass-card p-8 flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ background: "rgba(0,212,170,0.12)", color: "#00D4AA" }}>⇄</div>
                <div>
                  <h3 className="text-xl font-black text-white">Stelfi Swap</h3>
                  <p className="text-xs mt-0.5" style={{ color: "#00D4AA" }}>Cross-Border Stablecoin Exchange</p>
                </div>
              </div>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: "#8B9EC7" }}>
                <p>Stelfi Swap gives anyone the ability to exchange stablecoins across currencies in real time. Powered by Arc Network&apos;s native infrastructure and Circle App Kit, Swap supports USDC, EURC, BRLA, MXNB, PHPC, JPYC, and KRW1.</p>
                <p>With a transparent 0.3% fee, sub-second settlement, and USDC as the gas token, Stelfi Swap eliminates the hidden costs and delays that plague traditional foreign exchange.</p>
              </div>
              <div className="flex flex-col gap-2.5">
                <CheckItem text="7 stablecoin pairs supported" />
                <CheckItem text="0.3% transparent fee — no hidden costs" />
                <CheckItem text="Sub-second settlement on Arc Network" />
                <CheckItem text="Powered by Circle App Kit SDK" />
                <CheckItem text="Non-custodial — your keys, your assets" />
              </div>
            </motion.div>

            {/* Predict card */}
            <motion.div variants={staggerItem} className="glass-card p-8 flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ background: "rgba(0,212,170,0.12)", color: "#00D4AA" }}>◎</div>
                <div>
                  <h3 className="text-xl font-black text-white">Stelfi Predict</h3>
                  <p className="text-xs mt-0.5" style={{ color: "#00D4AA" }}>On-Chain Prediction Markets</p>
                </div>
              </div>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: "#8B9EC7" }}>
                <p>Stelfi Predict brings trustless prediction markets to Arc Network for the first time. Users stake USDC on binary YES/NO outcomes across financial, economic, and global events. Markets resolve on-chain with full transparency.</p>
                <p>Winners receive proportional payouts automatically via smart contract. Every bet, every resolution, every payout is permanently recorded on-chain and verifiable by anyone.</p>
              </div>
              <div className="flex flex-col gap-2.5">
                <CheckItem text="First prediction market on Arc Network" />
                <CheckItem text="Binary YES/NO markets in USDC" />
                <CheckItem text="Fully on-chain resolution and payouts" />
                <CheckItem text="Proportional winnings — no house edge" />
                <CheckItem text="Transparent odds updated in real time" />
              </div>
            </motion.div>

            {/* Bridge card */}
            <motion.div variants={staggerItem} className="glass-card p-8 flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ background: "rgba(0,212,170,0.12)", color: "#00D4AA" }}>⛓</div>
                <div>
                  <h3 className="text-xl font-black text-white">Stelfi Bridge</h3>
                  <p className="text-xs mt-0.5" style={{ color: "#00D4AA" }}>Cross-Chain USDC Transfer</p>
                </div>
              </div>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: "#8B9EC7" }}>
                <p>Stelfi Bridge enables seamless USDC movement from Ethereum, Base, Arbitrum, and other major blockchains directly into Arc Network in under 30 seconds. Built on Circle&apos;s industry-standard CCTP protocol.</p>
                <p>Bridge uses a native burn-and-mint mechanism, eliminating the risk of wrapped tokens or synthetic assets. Your USDC arrives on Arc as native, first-class USDC.</p>
              </div>
              <div className="flex flex-col gap-2.5">
                <CheckItem text="Ethereum, Base, Arbitrum supported" />
                <CheckItem text="Circle CCTP — native burn and mint" />
                <CheckItem text="No wrapped tokens — zero bridge risk" />
                <CheckItem text="~20s attestation, under 1s Arc settlement" />
                <CheckItem text="Free to use on testnet" />
              </div>
            </motion.div>

            {/* Send card */}
            <motion.div variants={staggerItem} className="glass-card p-8 flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ background: "rgba(0,212,170,0.12)", color: "#00D4AA" }}>➤</div>
                <div>
                  <h3 className="text-xl font-black text-white">Stelfi Send</h3>
                  <p className="text-xs mt-0.5" style={{ color: "#00D4AA" }}>Instant Wallet-to-Wallet Transfers</p>
                </div>
              </div>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: "#8B9EC7" }}>
                <p>Stelfi Send gives anyone the ability to transfer USDC directly between wallets on Arc Network with sub-second confirmation. Whether paying a collaborator or splitting costs, Send makes it as simple as entering an address.</p>
                <p>No fees, no delays, no intermediaries. Transactions go directly from your wallet to the recipient via Arc Network.</p>
              </div>
              <div className="flex flex-col gap-2.5">
                <CheckItem text="Send to any 0x wallet address" />
                <CheckItem text="Sub-second confirmation on Arc" />
                <CheckItem text="USDC-denominated gas — predictable cost" />
                <CheckItem text="Non-custodial — funds go directly" />
                <CheckItem text="Full transaction history on ArcScan" />
              </div>
            </motion.div>

            {/* Unified Balance card — full width on md */}
            <motion.div variants={staggerItem} className="glass-card p-8 flex flex-col gap-6 md:col-span-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ background: "rgba(0,212,170,0.12)", color: "#00D4AA" }}>⬡</div>
                <div>
                  <h3 className="text-xl font-black text-white">Unified Balance</h3>
                  <p className="text-xs mt-0.5" style={{ color: "#00D4AA" }}>Chain-Abstracted USDC Management</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 text-sm leading-relaxed" style={{ color: "#8B9EC7" }}>
                  <p>Unified Balance is Stelfi&apos;s most advanced capability — and the first consumer-facing implementation on Arc Network. Powered by Circle Gateway, it lets users pool USDC from multiple blockchains into a single, instantly spendable balance.</p>
                  <p>Forget managing USDC on five different chains. Deposit once from anywhere, spend instantly on Arc.</p>
                </div>
                <div className="flex flex-col gap-2.5">
                  <CheckItem text="Deposit from Ethereum, Base, Arbitrum" />
                  <CheckItem text="Single unified USDC balance on Arc" />
                  <CheckItem text="Powered by Circle Gateway" />
                  <CheckItem text="Spend instantly — no per-chain delays" />
                  <CheckItem text="First consumer UI for this on Arc" />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* ── SECTION 4: WHY ARC ── */}
        <motion.div
          variants={fadeUpVariants}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.15 }}
          className="mb-24"
        >
          <div className="glass-card p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-2xl font-black text-white mb-6">Why We Build on Arc Network</h2>
                <div className="space-y-4 text-sm leading-relaxed" style={{ color: "#8B9EC7" }}>
                  <p>
                    Arc Network, built by Circle, is the world&apos;s first blockchain purpose-built for
                    stablecoin finance. Unlike general-purpose blockchains where USDC is just another token,
                    Arc makes USDC the native currency of the entire network — including gas fees.
                  </p>
                  <p>
                    This means every transaction on Stelfi is denominated in dollars. No volatile gas tokens.
                    No unpredictable costs. Just clean, predictable, dollar-denominated finance at the speed
                    of the internet.
                  </p>
                  <p>
                    Arc&apos;s sub-second finality, EVM compatibility, and compliance-ready architecture make
                    it the ideal foundation for a platform like Stelfi — one that aims to serve real users
                    with real money needs.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <StatCard value="< 1s"    label="Settlement Speed" />
                <StatCard value="USDC"    label="Native Gas Token" />
                <StatCard value="5042002" label="Chain ID" />
                <StatCard value="EVM"     label="Compatible" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── SECTION 5: VALUES ── */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.1 }}
          className="mb-24"
        >
          <motion.div variants={staggerItem} className="text-center mb-12">
            <h2 className="text-2xl font-black text-white mb-3">What We Stand For</h2>
            <p style={{ color: "#8B9EC7" }}>The principles that guide every decision we make at Stelfi</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "👁",
                title: "Radical Transparency",
                body: "Every rate, every fee, every transaction is visible on-chain. We do not take hidden commissions or run opaque pricing. What you see is exactly what you get.",
              },
              {
                icon: "🌍",
                title: "Financial Accessibility",
                body: "We build for the freelancer in Lagos, the student in Manila, and the entrepreneur in Mexico City. Stelfi is designed so that anyone with a smartphone and a wallet can access institutional-grade financial tools.",
              },
              {
                icon: "🔐",
                title: "Security First",
                body: "Our smart contracts are built on OpenZeppelin's battle-tested libraries. We are non-custodial — we never hold your funds. Your private key is your financial sovereignty.",
              },
            ].map((v) => (
              <motion.div key={v.title} variants={staggerItem} className="glass-card p-7 flex flex-col gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: "rgba(0,212,170,0.1)" }}
                >
                  {v.icon}
                </div>
                <h3 className="text-lg font-bold text-white">{v.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#8B9EC7" }}>{v.body}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── SECTION 6: TECH STACK ── */}
        <motion.div
          variants={fadeUpVariants}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.2 }}
          className="mb-24 text-center"
        >
          <h2 className="text-2xl font-black text-white mb-3">Built With Best-in-Class Technology</h2>
          <p className="mb-10 text-sm" style={{ color: "#8B9EC7" }}>
            Every layer of Stelfi is built with production-grade, open-source tooling
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {TECH_STACK.map((tech) => (
              <span key={tech} className="token-pill text-sm px-4 py-2">{tech}</span>
            ))}
          </div>
        </motion.div>

        {/* ── SECTION 7: CTA ── */}
        <motion.div
          variants={scaleInVariants}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.3 }}
        >
          <div
            className="glass-card p-10 md:p-16 text-center"
            style={{ border: "1px solid rgba(0,212,170,0.25)", boxShadow: "0 0 60px rgba(0,212,170,0.08)" }}
          >
            <h2 className="text-3xl font-black text-white mb-4">Ready to Experience Stelfi?</h2>
            <p className="max-w-xl mx-auto mb-10 text-base" style={{ color: "#8B9EC7" }}>
              Join the first users of Arc Network&apos;s most complete DeFi platform. Swap stablecoins or
              make your first prediction — all in under 60 seconds.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <Link href="/swap" className="btn-primary inline-flex items-center justify-center px-6 rounded-xl font-bold text-sm no-underline" style={{ background: "linear-gradient(135deg,#00D4AA,#00B8A0)", color: "#050A14", height: "48px" }}>
                Launch Swap →
              </Link>
              <Link href="/predict" className="inline-flex items-center justify-center px-6 rounded-xl font-bold text-sm no-underline transition-all duration-300" style={{ background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.3)", color: "#00D4AA", height: "48px" }}>
                Launch Predict →
              </Link>
              <Link href="/bridge" className="inline-flex items-center justify-center px-6 rounded-xl font-bold text-sm no-underline transition-all duration-300" style={{ background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.3)", color: "#00D4AA", height: "48px" }}>
                Launch Bridge →
              </Link>
            </div>
            <Link href="/contact" className="text-sm no-underline" style={{ color: "#8B9EC7" }}>
              Have questions?{" "}
              <span className="underline" style={{ color: "#00D4AA" }}>Contact us →</span>
            </Link>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
