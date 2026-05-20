"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  pageVariants,
  fadeUpVariants,
  staggerContainer,
  staggerItem,
  numberVariants,
} from "@/lib/animations";

const tokens = ["USDC", "EURC", "BRLA", "MXNB", "PHPC", "JPYC", "KRW1"];

const STATS = [
  { value: "< 1s", label: "Settlement Speed" },
  { value: "USDC", label: "Native Gas Token" },
  { value: "0.3%", label: "Swap Fee" },
];

function useCountUp(target: string, inView: boolean) {
  const [display, setDisplay] = useState("0");
  const num = parseFloat(target.replace(/[^0-9.]/g, ""));
  const isNumeric = !isNaN(num) && target !== "USDC";

  useEffect(() => {
    if (!inView || !isNumeric) {
      setDisplay(target);
      return;
    }
    let start = 0;
    const steps = 40;
    const inc = num / steps;
    const interval = setInterval(() => {
      start += inc;
      if (start >= num) {
        setDisplay(target);
        clearInterval(interval);
      } else {
        const prefix = target.replace(/[0-9.<>]/g, "");
        setDisplay(prefix + start.toFixed(target.includes(".") ? 1 : 0));
      }
    }, 30);
    return () => clearInterval(interval);
  }, [inView, isNumeric, num, target]);

  return display;
}

function StatItem({ value, label, inView }: { value: string; label: string; inView: boolean }) {
  const display = useCountUp(value, inView);
  return (
    <motion.div variants={staggerItem} className="flex-1 flex flex-col items-center py-6">
      <motion.span variants={numberVariants} className="text-2xl font-bold" style={{ color: "#00D4AA" }}>
        {display}
      </motion.span>
      <span className="text-xs mt-1" style={{ color: "#8B9EC7" }}>{label}</span>
    </motion.div>
  );
}

function ScrollIndicator() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY < 80);
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

export default function HomePage() {
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsInView, setStatsInView] = useState(false);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsInView(true); },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="relative flex flex-col items-center px-6 pb-16 min-h-screen"
      style={{ zIndex: 1 }}
    >
      {/* Hero */}
      <div className="flex flex-col items-center text-center pt-36 pb-16 w-full max-w-4xl">
        {/* Arc badge */}
        <motion.span
          variants={fadeUpVariants}
          className="mb-8 px-4 py-1.5 rounded-full text-xs font-semibold border inline-flex items-center gap-2"
          style={{ color: "#00D4AA", borderColor: "rgba(0,212,170,0.3)", backgroundColor: "rgba(0,212,170,0.08)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block pulse-glow" />
          Built on Arc Network · Powered by USDC
        </motion.span>

        {/* Headline */}
        <motion.h1
          variants={staggerContainer}
          className="text-5xl md:text-7xl font-black leading-tight mb-6"
        >
          <motion.span variants={staggerItem} className="block text-white">
            Stellar Finance.
          </motion.span>
          <motion.span
            variants={staggerItem}
            className="block"
            style={{
              background: "linear-gradient(135deg, #00D4AA, #00FFD1)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 40px rgba(0,212,170,0.4))",
            }}
          >
            Simplified.
          </motion.span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          variants={fadeUpVariants}
          className="max-w-xl text-base md:text-lg mb-12"
          style={{ color: "#8B9EC7" }}
        >
          Swap stablecoins and predict outcomes — all on Arc Network, powered by USDC.
        </motion.p>

        {/* Feature cards */}
        <motion.div
          variants={staggerContainer}
          className="w-full grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <FeatureCard
            icon="⇄"
            title="Stelfi Swap"
            description="Exchange stablecoins across borders instantly. USDC, EURC, BRLA, MXNB, PHPC, JPYC, KRW1 — all at transparent rates."
            href="/swap"
            cta="Launch Swap →"
          >
            <div className="flex flex-wrap gap-2">
              {tokens.map((t) => (
                <span key={t} className="token-pill">{t}</span>
              ))}
            </div>
          </FeatureCard>

          <FeatureCard
            icon="◎"
            title="Stelfi Predict"
            description="Stake USDC on real-world outcomes. Markets resolve on-chain, winnings paid instantly."
            href="/predict"
            cta="Launch Predict →"
          >
            <div className="flex gap-3">
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5"
                style={{ backgroundColor: "rgba(0,212,170,0.12)", color: "#00D4AA" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                3 Active Markets
              </span>
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "#8B9EC7", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                Powered by USDC
              </span>
            </div>
          </FeatureCard>
        </motion.div>

        <ScrollIndicator />
      </div>

      {/* Stats bar */}
      <motion.div
        ref={statsRef}
        variants={staggerContainer}
        initial="initial"
        animate={statsInView ? "animate" : "initial"}
        className="glass-card w-full max-w-2xl flex flex-col md:flex-row mb-16"
        style={{ borderRadius: "20px" }}
      >
        {STATS.map((s, i) => (
          <div
            key={i}
            className="flex-1"
            style={{ borderRight: i < STATS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : undefined }}
          >
            <StatItem value={s.value} label={s.label} inView={statsInView} />
          </div>
        ))}
      </motion.div>

      {/* Footer */}
      <motion.footer
        variants={fadeUpVariants}
        className="text-xs text-center"
        style={{ color: "#4A5568" }}
      >
        Built on Arc Network · Powered by USDC · © 2026 Stelfi
      </motion.footer>
    </motion.div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  href,
  cta,
  children,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -6, boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(0,212,170,0.15)" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="glass-card flex flex-col gap-4 p-6 h-full"
    >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ backgroundColor: "rgba(0,212,170,0.12)", color: "#00D4AA" }}
        >
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
          <p className="text-sm leading-relaxed" style={{ color: "#8B9EC7" }}>
            {description}
          </p>
        </div>
        {children}
        <Link
          href={href}
          className="mt-auto btn-primary inline-flex items-center justify-center h-11 rounded-xl font-semibold text-sm no-underline"
          style={{ backgroundColor: "#00D4AA", color: "#050A14" }}
        >
          {cta}
        </Link>
    </motion.div>
  );
}
