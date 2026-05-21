"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState, useEffect } from "react";

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/swap",    label: "Swap"       },
    { href: "/predict", label: "Predict"    },
    { href: "/about",   label: "About"      },
    { href: "/contact", label: "Contact Us" },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        style={{ height: "64px" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? "glass-nav" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-full">
          {/* Logo */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/" className="flex items-center gap-2 no-underline">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #00D4AA, #00B8A0)",
                  boxShadow: "0 0 20px rgba(0, 212, 170, 0.4)",
                }}
              >
                <span className="text-[#050A14] font-black text-sm">S</span>
              </div>
              <span
                className="text-2xl font-black tracking-tight"
                style={{
                  background: "linear-gradient(135deg, #FFFFFF, #00D4AA)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Stelfi
              </span>
            </Link>
          </motion.div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1 glass-card px-4 py-2 rounded-full">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative px-3 py-2 rounded-full text-sm font-semibold transition-all duration-300 no-underline whitespace-nowrap"
                  style={{ color: isActive ? "#050A14" : "rgba(139, 158, 199, 1)" }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: "linear-gradient(135deg, #00D4AA, #00B8A0)",
                        boxShadow: "0 0 16px rgba(0, 212, 170, 0.4)",
                      }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right: ConnectButton + Mobile toggle */}
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
            </div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden glass-card p-2 rounded-lg border-0 cursor-pointer"
            >
              <div className="w-5 h-4 flex flex-col justify-between">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={
                      mobileOpen
                        ? {
                            rotate: i === 0 ? 45 : i === 2 ? -45 : 0,
                            y: i === 0 ? 6 : i === 2 ? -6 : 0,
                            opacity: i === 1 ? 0 : 1,
                          }
                        : { rotate: 0, y: 0, opacity: 1 }
                    }
                    className="block w-full h-0.5 rounded-full"
                    style={{ background: "#00D4AA" }}
                  />
                ))}
              </div>
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed top-16 left-4 right-4 z-40 glass-card rounded-2xl p-4"
          >
            {navLinks.map((link, i) => (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 rounded-xl text-sm font-semibold no-underline transition-all duration-200"
                  style={{
                    color: pathname === link.href ? "#00D4AA" : "#8B9EC7",
                    background:
                      pathname === link.href ? "rgba(0, 212, 170, 0.1)" : "transparent",
                  }}
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}
            <div
              className="mt-3 pt-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
            >
              <ConnectButton />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Navbar;
