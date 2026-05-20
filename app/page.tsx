import Link from "next/link";

const tokens = ["USDC", "EURC", "BRLA", "MXNB", "PHPC", "JPYC", "KRW1"];

const stats = [
  { value: "< 1s", label: "Settlement Speed" },
  { value: "USDC", label: "Native Gas Token" },
  { value: "0.3%", label: "Swap Fee" },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center px-6 pt-20 pb-16 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, #00D4AA18, transparent)",
        }}
      />
      {/* Faint grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(#8B9EC7 1px, transparent 1px), linear-gradient(90deg, #8B9EC7 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Badge */}
      <span
        className="relative z-10 mb-6 px-4 py-1.5 rounded-full text-xs font-medium border"
        style={{ color: "#00D4AA", borderColor: "#00D4AA44", backgroundColor: "#00D4AA11" }}
      >
        Built on Arc Network · Powered by USDC
      </span>

      {/* Headline */}
      <h1 className="relative z-10 text-center font-bold leading-tight text-5xl md:text-7xl text-white mb-4">
        Stellar Finance.
        <br />
        <span
          style={{
            background: "linear-gradient(90deg, #00D4AA, #00B896)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Simplified.
        </span>
      </h1>

      {/* Subtext */}
      <p
        className="relative z-10 text-center max-w-xl text-base md:text-lg mb-14"
        style={{ color: "#8B9EC7" }}
      >
        Swap stablecoins and predict outcomes — all on Arc Network, powered by USDC.
      </p>

      {/* Feature cards */}
      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
        {/* Swap card */}
        <FeatureCard
          icon="⇄"
          title="Stelfi Swap"
          description="Exchange stablecoins across borders instantly. USDC, EURC, BRLA, MXNB, PHPC, JPYC, KRW1 — all at transparent rates."
          href="/swap"
          cta="Launch Swap →"
        >
          <div className="flex flex-wrap gap-2">
            {tokens.map((t) => (
              <span
                key={t}
                className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: "#0A0F1E", color: "#8B9EC7", border: "1px solid #1E2D4A" }}
              >
                {t}
              </span>
            ))}
          </div>
        </FeatureCard>

        {/* Predict card */}
        <FeatureCard
          icon="◎"
          title="Stelfi Predict"
          description="Stake USDC on real-world outcomes. Markets resolve on-chain, winnings paid instantly."
          href="/predict"
          cta="Launch Predict →"
        >
          <div className="flex gap-3">
            <span
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: "#00D4AA22", color: "#00D4AA" }}
            >
              3 Active Markets
            </span>
            <span
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: "#0A0F1E", color: "#8B9EC7", border: "1px solid #1E2D4A" }}
            >
              Powered by USDC
            </span>
          </div>
        </FeatureCard>
      </div>

      {/* Stats bar */}
      <div
        className="relative z-10 w-full max-w-2xl rounded-2xl border flex flex-col md:flex-row mb-16"
        style={{ backgroundColor: "#1A2340", borderColor: "#1E2D4A" }}
      >
        {stats.map((s, i) => (
          <div
            key={i}
            className="flex-1 flex flex-col items-center py-6"
            style={{
              borderRight: i < stats.length - 1 ? "1px solid #1E2D4A" : undefined,
            }}
          >
            <span className="text-2xl font-bold text-white">{s.value}</span>
            <span className="text-xs mt-1" style={{ color: "#8B9EC7" }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-xs text-center" style={{ color: "#8B9EC7" }}>
        Built on Arc Network · Powered by USDC · © 2026 Stelfi
      </footer>
    </div>
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
    <div
      className="flex flex-col gap-4 p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:border-accent group"
      style={{ backgroundColor: "#1A2340", borderColor: "#1E2D4A" }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
        style={{ backgroundColor: "#00D4AA22", color: "#00D4AA" }}
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
        className="mt-auto inline-flex items-center justify-center h-11 rounded-xl font-semibold text-sm transition-colors hover:opacity-90"
        style={{ backgroundColor: "#00D4AA", color: "#0A0F1E" }}
      >
        {cta}
      </Link>
    </div>
  );
}
