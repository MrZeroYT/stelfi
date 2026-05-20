import { Navbar } from "./Navbar";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: "#0A0F1E", minHeight: "100vh" }}>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 64px)" }}>{children}</main>
    </div>
  );
}
