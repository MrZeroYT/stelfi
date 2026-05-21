import { Navbar } from "./Navbar";
import ParticleField from "./ParticleField";
import PageTransition from "./PageTransition";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: "#050A14", minHeight: "100vh", position: "relative" }}>
      <ParticleField />
      <Navbar />
      <main style={{ position: "relative", zIndex: 1, isolation: "isolate", overflowX: "hidden" }}>
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
