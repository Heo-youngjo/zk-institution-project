import Link from "next/link";
import WalletPanel from "./WalletPanel";

export default function Header() {
  return (
    <header
      className="flex items-center h-12 px-4 gap-6 shrink-0"
      style={{ background: "var(--bg-1)", borderBottom: "1px solid var(--border)" }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <span
          className="text-xs font-bold tracking-widest px-2 py-0.5 rounded"
          style={{ background: "var(--blue)", color: "#fff", letterSpacing: "0.12em" }}
        >
          ZK
        </span>
        <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--text-0)" }}>
          Institution
        </span>
      </Link>

      <div className="v-divider h-5" />

      {/* Nav */}
      <nav className="flex items-center">
        <style>{`
          .hdr-link { color: var(--text-1); font-size: 13px; font-weight: 500; padding: 4px 10px; border-radius: 5px; transition: color .15s, background .15s; }
          .hdr-link:hover { color: var(--text-0); background: var(--bg-3); }
        `}</style>
        {[
          { href: "/",          label: "Markets" },
          { href: "/dashboard", label: "Portfolio" },
          { href: "/order",     label: "Trade" },
        ].map(({ href, label }) => (
          <Link key={href} href={href} className="hdr-link">{label}</Link>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Right: network badge + wallet */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded"
        style={{ background: "var(--bg-3)", border: "1px solid var(--border)" }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: "var(--green)" }}
        />
        <span style={{ color: "var(--text-1)", fontSize: 11 }}>Hardhat · 31337</span>
      </div>

      <WalletPanel />
    </header>
  );
}
