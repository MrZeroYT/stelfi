"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  fadeUpVariants,
  staggerContainer,
  staggerItem,
  numberVariants,
} from "@/lib/animations";

const tokens = ["USDC", "EURC", "BRLA", "MXNB", "PHPC", "JPYC", "KRW1"];

const STATS = [
  { value: "2",    label: "dApp Features"     },
  { value: "< 1s", label: "Settlement Speed"  },
  { value: "USDC", label: "Native Gas Token"  },
];

function useCountUp(target: string, inView: boolean) {
  const [display, setDisplay] = useState("0");
  const num = parseFloat(target.replace(/[^0-9.]/g, ""));
  const isNumeric = !isNaN(num) && target !== "USDC" && target !== "< 1s";
  useEffect(() => {
    if (!inView || !isNumeric) { setDisplay(target); return; }
    let start = 0;
    const steps = 40;
    const inc = num / steps;
    const interval = setInterval(() => {
      start += inc;
      if (start >= num) { setDisplay(target); clearInterval(interval); }
      else { const prefix = target.replace(/[0-9.<>]/g, ""); setDisplay(prefix + start.toFixed(0)); }
    }, 30);
    return () => clearInterval(interval);
  }, [inView, isNumeric, num, target]);
  return display;
}

function StatItem({ value, label, inView }: { value: string; label: string; inView: boolean }) {
  const display = useCountUp(value, inView);
  return (
    <motion.div variants={staggerItem} className="flex-1 flex flex-col items-center py-6">
      <motion.span variants={numberVariants} className="text-2xl font-bold" style={{ color: "#00D4AA" }}>{display}</motion.span>
      <span className="text-xs mt-1" style={{ color: "#8B9EC7" }}>{label}</span>
    </motion.div>
  );
}

function ScrollIndicator() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY < 200);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 10, 0] }}
          exit={{ opacity: 0 }}
          transition={{ y: { repeat: Infinity, duration: 1.4, ease: "easeInOut" }, opacity: { duration: 0.4 } }}
          className="flex flex-col items-center gap-1 mt-6"
          style={{ color: "#4A5568" }}
        >
          <span className="text-xs">scroll</span>
          <span className="text-lg">↓</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FeatureCard({
  icon, title, description, href, cta, badge, children,
}: {
  icon: string; title: string; description: string;
  href: string; cta: string; badge?: string; children?: React.ReactNode;
}) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -6, boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(0,212,170,0.15)" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="glass-card flex flex-col gap-4 p-6 h-full"
    >
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: "rgba(0,212,170,0.12)", color: "#00D4AA" }}>
          {icon}
        </div>
        {badge && (
          <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: "rgba(0,212,170,0.08)", color: "#00D4AA", border: "1px solid rgba(0,212,170,0.2)" }}>
            {badge}
          </span>
        )}
      </div>
      <div>
        <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
        <p className="text-sm leading-relaxed" style={{ color: "#8B9EC7" }}>{description}</p>
      </div>
      {children}
      <Link href={href} className="mt-auto btn-primary inline-flex items-center justify-center h-11 rounded-xl font-semibold text-sm no-underline" style={{ backgroundColor: "#00D4AA", color: "#050A14" }}>
        {cta}
      </Link>
    </motion.div>
  );
}

export default function HomePage() {
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsInView, setStatsInView] = useState(false);
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setStatsInView(true); }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative flex flex-col items-center pb-16 min-h-screen" style={{ zIndex: 1 }}>

      {/* ── Hero ── */}
      <div className="flex flex-col items-center text-center pt-16 pb-16 w-full max-w-4xl">
        <motion.span variants={fadeUpVariants} className="mb-8 px-4 py-1.5 rounded-full text-xs font-semibold border inline-flex items-center gap-2"
          style={{ color: "#00D4AA", borderColor: "rgba(0,212,170,0.3)", backgroundColor: "rgba(0,212,170,0.08)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block pulse-glow" />
          Built on Arc Network · Powered by USDC
        </motion.span>

        <motion.h1 variants={staggerContainer} className="text-5xl md:text-7xl font-black leading-tight mb-6">
          <motion.span variants={staggerItem} className="block text-white">Stellar Finance.</motion.span>
          <motion.span variants={staggerItem} className="block"
            style={{ background: "linear-gradient(135deg, #00D4AA, #00FFD1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 40px rgba(0,212,170,0.4))" }}>
            Simplified.
          </motion.span>
        </motion.h1>

        <motion.p variants={fadeUpVariants} className="max-w-xl text-base md:text-lg mb-12" style={{ color: "#8B9EC7" }}>
          Swap stablecoins and predict real-world outcomes — on Arc Network, powered by USDC.
        </motion.p>

        {/* 2 Feature Cards */}
        <motion.div variants={staggerContainer} className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:max-w-3xl">
          <FeatureCard icon="⇄" title="Stelfi Swap" badge="Live on Arc" description="Exchange stablecoins across borders instantly. USDC, EURC, BRLA, MXNB, PHPC, JPYC, KRW1 — transparent rates, 0.3% fee." href="/swap" cta="Launch Swap →">
            <div className="flex flex-wrap gap-1.5">{tokens.map((t) => <span key={t} className="token-pill">{t}</span>)}</div>
          </FeatureCard>

          <FeatureCard icon="◎" title="Stelfi Predict" badge="First on Arc" description="Stake USDC on real-world outcomes. Binary markets resolve on-chain. Winners paid instantly via smart contract." href="/predict" cta="Launch Predict →">
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5" style={{ backgroundColor: "rgba(0,212,170,0.12)", color: "#00D4AA" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />3 Active Markets
              </span>
            </div>
          </FeatureCard>
        </motion.div>

        <ScrollIndicator />
      </div>

      {/* ── Stats bar ── */}
      <motion.div ref={statsRef} variants={staggerContainer} initial="initial" animate={statsInView ? "animate" : "initial"}
        className="glass-card w-full max-w-2xl flex flex-col md:flex-row mb-16" style={{ borderRadius: "20px" }}>
        {STATS.map((s, i) => (
          <div key={i} className="flex-1" style={{ borderRight: i < STATS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : undefined }}>
            <StatItem value={s.value} label={s.label} inView={statsInView} />
          </div>
        ))}
      </motion.div>

      {/* ── Why Stelfi ── */}
      <motion.section variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.15 }}
        className="w-full max-w-5xl mb-20">
        <motion.div variants={staggerItem} className="text-center mb-10">
          <h2 className="text-3xl font-black text-white mb-3">Why Stelfi?</h2>
          <p className="max-w-xl mx-auto text-base" style={{ color: "#8B9EC7" }}>We built what Arc Network was designed for — and nobody else had.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: "💎", title: "Zero Hidden Costs", body: "Every fee on Stelfi is displayed before you confirm. Our 0.3% swap fee is the only cost — USDC gas on Arc means no volatile fee surprises." },
            { icon: "🏆", title: "First on Arc Network", body: "Stelfi is the first platform to bring live stablecoin swaps and on-chain prediction markets together in one dApp on Arc — before anyone else." },
            { icon: "🔐", title: "You Own Your Assets", body: "Stelfi never holds your funds. All transactions go directly to and from your wallet via smart contracts. Your keys, your money — always." },
          ].map((c) => (
            <motion.div key={c.title} variants={staggerItem} className="glass-card p-7 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: "rgba(0,212,170,0.1)" }}>{c.icon}</div>
              <h3 className="text-lg font-bold text-white">{c.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#8B9EC7" }}>{c.body}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── How It Works ── */}
      <motion.section variants={staggerContainer} initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.15 }}
        className="w-full max-w-4xl mb-20">
        <motion.div variants={staggerItem} className="text-center mb-10">
          <h2 className="text-3xl font-black text-white mb-3">How Stelfi Works</h2>
          <p className="text-base" style={{ color: "#8B9EC7" }}>Three steps to financial freedom</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { num: "01", title: "Connect Your Wallet", body: "Connect MetaMask or any EVM wallet. Add Arc Testnet and claim free USDC from the faucet to get started instantly." },
            { num: "02", title: "Choose Your Feature", body: "Swap stablecoins across currencies or stake USDC on a real-world outcome with Stelfi Predict — from the same platform." },
            { num: "03", title: "Transact in Under 1 Second", body: "Arc Network settles every transaction in under one second. No waiting. No uncertainty. Just instant finance." },
          ].map((step) => (
            <motion.div key={step.num} variants={staggerItem} className="glass-card p-7 flex flex-col gap-4 text-center items-center">
              <div className="text-2xl font-black" style={{ color: "#00D4AA" }}>{step.num}</div>
              <h3 className="text-lg font-bold text-white">{step.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#8B9EC7" }}>{step.body}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── Built on Arc ── */}
      <motion.section variants={fadeUpVariants} initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.15 }}
        className="w-full max-w-5xl mb-20">
        <div className="glass-card p-8 md:p-12" style={{ border: "1px solid rgba(0,212,170,0.15)", background: "rgba(0,212,170,0.04)" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border mb-4"
                style={{ color: "#00D4AA", borderColor: "rgba(0,212,170,0.3)", backgroundColor: "rgba(0,212,170,0.08)" }}>
                Powered by Circle
              </span>
              <h2 className="text-2xl font-black text-white mb-4">Built on the World&apos;s First Stablecoin-Native Blockchain</h2>
              <div className="space-y-3 text-sm leading-relaxed" style={{ color: "#8B9EC7" }}>
                <p>Arc Network, built by Circle, is designed from the ground up for stablecoin finance. Unlike general blockchains where USDC is just another token, Arc makes USDC the native currency of the entire network.</p>
                <p>This means every Stelfi transaction is priced in dollars. No ETH. No gas price anxiety. Just clean, predictable, dollar-denominated finance at internet speed.</p>
              </div>
              <a href="https://arc.io" target="_blank" rel="noopener noreferrer" className="inline-block mt-5 text-sm font-semibold no-underline hover:underline" style={{ color: "#00D4AA" }}>
                Learn about Arc Network →
              </a>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { v: "< 1s",  l: "Finality Speed"  },
                { v: "USDC",  l: "Native Gas Token" },
                { v: "EVM",   l: "Compatible"       },
                { v: "Circle",l: "Backed & Built"   },
              ].map((s) => (
                <div key={s.l} className="glass-card p-5 text-center">
                  <div className="text-xl font-black mb-1" style={{ color: "#00D4AA" }}>{s.v}</div>
                  <div className="text-xs" style={{ color: "#8B9EC7" }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Live on Testnet ── */}
      <motion.section variants={fadeUpVariants} initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.2 }}
        className="w-full max-w-2xl mb-16">
        <div className="glass-card p-10 text-center" style={{ border: "1px solid rgba(0,212,170,0.2)", boxShadow: "0 0 40px rgba(0,212,170,0.06)" }}>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse inline-block" />
            <span className="text-sm font-semibold" style={{ color: "#00D4AA" }}>Live on Arc Testnet</span>
          </div>
          <h2 className="text-2xl font-black text-white mb-4">Try Stelfi Right Now</h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: "#8B9EC7" }}>
            Stelfi is fully functional on Arc Testnet. Get free testnet USDC from the Circle faucet and try every feature — no real money required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-bold text-sm no-underline transition-all"
              style={{ background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.3)", color: "#00D4AA" }}>
              Get Free Testnet USDC
            </a>
            <Link href="/swap" className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-bold text-sm no-underline"
              style={{ background: "linear-gradient(135deg,#00D4AA,#00B8A0)", color: "#050A14" }}>
              Try Stelfi Swap →
            </Link>
          </div>
          <p className="text-xs mt-4" style={{ color: "#4A5568" }}>Arc Testnet · Chain ID 5042002 · Powered by USDC</p>
        </div>
      </motion.section>

      {/* ── Contact CTA ── */}
      <motion.section variants={fadeUpVariants} whileInView="animate" initial="initial" viewport={{ once: true }}
        className="w-full max-w-2xl mt-4 mb-8">
        <div className="glass-card p-12 text-center" style={{ border: "1px solid rgba(0,212,170,0.2)", boxShadow: "0 0 40px rgba(0,212,170,0.06)" }}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border mb-6"
            style={{ color: "#00D4AA", borderColor: "rgba(0,212,170,0.3)", backgroundColor: "rgba(0,212,170,0.08)" }}>
            Get in Touch
          </span>
          <h2 className="text-2xl font-black text-white mb-4">Questions? We Are Here.</h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: "#8B9EC7" }}>
            Have a question about Stelfi, want to report an issue, or interested in building on Arc Network together? We read every message personally.
          </p>
          <Link href="/contact" className="btn-primary inline-flex items-center justify-center px-8 rounded-xl font-bold text-base no-underline"
            style={{ background: "linear-gradient(135deg,#00D4AA,#00B8A0)", color: "#050A14", height: "52px" }}>
            Contact Us →
          </Link>
        </div>
      </motion.section>

      {/* ── Footer ── */}
      <motion.footer variants={fadeUpVariants} className="w-full max-w-2xl mt-8 pt-8 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="mb-4">
          <span className="text-2xl font-black glow-text">Stelfi</span>
          <p className="text-sm mt-1" style={{ color: "#8B9EC7" }}>Stellar Finance. Simplified.</p>
        </div>
        <div className="flex justify-center gap-5 mb-4 flex-wrap">
          {[
            { href: "/swap",    label: "Swap"    },
            { href: "/predict", label: "Predict" },
            { href: "/about",   label: "About"   },
            { href: "/contact", label: "Contact" },
          ].map((link) => (
            <Link key={link.href} href={link.href} className="text-sm no-underline transition-colors hover:text-white" style={{ color: "#8B9EC7" }}>
              {link.label}
            </Link>
          ))}
        </div>
        <p className="text-xs" style={{ color: "#4A5568" }}>Built on Arc Network · Powered by USDC · © 2026 Stelfi</p>
      </motion.footer>
    </div>
  );
}
