import Link from "next/link";
import WalletPanel from "./WalletPanel";

export default function Header() {
  return (
    <header
      style={{ background: "var(--tv-bg-secondary)", borderBottom: "1px solid var(--tv-border)" }}
      className="sticky top-0 z-50 h-12 flex items-center px-4 gap-6"
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <span
          className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded"
          style={{ background: "var(--tv-blue)", color: "#fff" }}
        >
          ZK
        </span>
        <span className="text-sm font-semibold" style={{ color: "var(--tv-text-primary)" }}>
          Institution
        </span>
      </Link>

      {/* Divider */}
      <div className="w-px h-5" style={{ background: "var(--tv-border)" }} />

      {/* Nav — CSS hover only, no JS event handlers */}
      <nav className="flex items-center gap-1">
        <style>{`
          .tv-nav-link { color: var(--tv-text-muted); }
          .tv-nav-link:hover { color: var(--tv-text-primary); background: var(--tv-bg-tertiary); }
        `}</style>
        {[
          { href: "/",          label: "Markets"   },
          { href: "/dashboard", label: "Dashboard" },
          { href: "/order",     label: "Swap"      },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="tv-nav-link px-3 py-1 text-xs font-medium rounded transition-colors"
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex-1" />

      <WalletPanel />
    </header>
  );
}
