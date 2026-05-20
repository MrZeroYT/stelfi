"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/swap", label: "Swap" },
    { href: "/predict", label: "Predict" },
  ];

  const linkClass = (href: string) =>
    `text-sm font-medium transition-colors ${
      pathname === href
        ? "text-accent border-b-2 border-accent pb-0.5"
        : "text-textSecondary hover:text-white"
    }`;

  return (
    <nav
      className="w-full h-16 flex items-center justify-between px-6 border-b"
      style={{ backgroundColor: "#0A0F1E", borderColor: "#1E2D4A" }}
    >
      {/* Logo */}
      <Link
        href="/"
        className="text-2xl font-bold"
        style={{ color: "#00D4AA" }}
      >
        Stelfi
      </Link>

      {/* Desktop nav links */}
      <div className="hidden md:flex items-center gap-8">
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href} className={linkClass(link.href)}>
            {link.label}
          </Link>
        ))}
      </div>

      {/* Right side: connect button + mobile hamburger */}
      <div className="flex items-center gap-4">
        <div className="hidden md:block">
          <ConnectButton chainStatus="icon" showBalance={false} />
        </div>

        {/* Hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-1"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span
            className={`block w-6 h-0.5 bg-white transition-transform ${menuOpen ? "rotate-45 translate-y-2" : ""}`}
          />
          <span
            className={`block w-6 h-0.5 bg-white transition-opacity ${menuOpen ? "opacity-0" : ""}`}
          />
          <span
            className={`block w-6 h-0.5 bg-white transition-transform ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`}
          />
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          className="absolute top-16 left-0 right-0 z-50 flex flex-col gap-4 px-6 py-5 border-b md:hidden"
          style={{ backgroundColor: "#0A0F1E", borderColor: "#1E2D4A" }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={linkClass(link.href)}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2">
            <ConnectButton chainStatus="icon" showBalance={false} />
          </div>
        </div>
      )}
    </nav>
  );
}
