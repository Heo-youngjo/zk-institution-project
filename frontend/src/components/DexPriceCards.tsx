"use client";

const TICKERS = [
  { pair: "ETH/USDC",  price: "2,450.21",  change: "+1.24%",  up: true  },
  { pair: "BTC/USDC",  price: "43,120.50", change: "-0.52%",  up: false },
  { pair: "ARB/USDC",  price: "1.8540",    change: "+5.41%",  up: true  },
  { pair: "SOL/USDC",  price: "142.30",    change: "+2.18%",  up: true  },
  { pair: "LINK/USDC", price: "14.82",     change: "-1.03%",  up: false },
  { pair: "UNI/USDC",  price: "7.640",     change: "+0.88%",  up: true  },
  { pair: "AAVE/USDC", price: "94.20",     change: "+3.21%",  up: true  },
  { pair: "MKR/USDC",  price: "1,382.00",  change: "-0.74%",  up: false },
];

// 두 배로 복사해서 무한 루프 자연스럽게
const DOUBLED = [...TICKERS, ...TICKERS];

export default function DexPriceCards() {
  return (
    <div
      className="overflow-hidden h-9 flex items-center"
      style={{ borderBottom: "1px solid var(--tv-border)", background: "var(--tv-bg-secondary)" }}
    >
      <div className="ticker-track">
        {DOUBLED.map((t, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-6 shrink-0"
            style={{ borderRight: "1px solid var(--tv-border)" }}
          >
            <span className="text-xs font-semibold" style={{ color: "var(--tv-text-primary)" }}>
              {t.pair}
            </span>
            <span className="text-xs font-mono" style={{ color: "var(--tv-text-primary)" }}>
              ${t.price}
            </span>
            <span
              className="text-xs font-mono"
              style={{ color: t.up ? "var(--tv-green)" : "var(--tv-red)" }}
            >
              {t.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
