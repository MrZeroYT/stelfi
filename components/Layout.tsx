import { Navbar } from "./Navbar";
import ParticleField from "./ParticleField";
import PageTransition from "./PageTransition";
import ScrollToTop from "./ScrollToTop";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: "#050A14", minHeight: "100vh", position: "relative" }}>
      <ParticleField />
      <ScrollToTop />
      <Navbar />
      <main
        className="page-container"
        style={{
          paddingTop: "64px",
          minHeight: "calc(100vh - 64px)",
          position: "relative",
          zIndex: 1,
          isolation: "isolate",
          overflowX: "hidden",
        }}
      >
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
