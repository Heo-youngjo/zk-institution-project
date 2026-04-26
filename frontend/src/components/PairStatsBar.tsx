"use client";

import { useState } from "react";

const PAIRS = [
  { symbol: "BINANCE:ETHUSDT", label: "ETH/USDT", price: 2450.55, change: 1.24,  high: 2489.20, low: 2401.80, vol: "182,401 ETH" },
  { symbol: "BINANCE:BTCUSDT", label: "BTC/USDT", price: 43120.50, change: -0.52, high: 43850.00, low: 42910.00, vol: "8,241 BTC" },
  { symbol: "BINANCE:SOLUSDT", label: "SOL/USDT", price: 142.30,  change: 2.18,  high: 145.80,  low: 138.90,  vol: "521,030 SOL" },
  { symbol: "BINANCE:ARBUSD",  label: "ARB/USDT", price: 1.854,   change: 5.41,  high: 1.920,   low: 1.791,   vol: "3.21M ARB" },
];

interface Props { onSymbolChange?: (s: string) => void; }

export default function PairStatsBar({ onSymbolChange }: Props) {
  const [sel, setSel] = useState(0);
  const p = PAIRS[sel];
  const up = p.change >= 0;
  const color = up ? "var(--green)" : "var(--red)";

  const select = (i: number) => { setSel(i); onSymbolChange?.(PAIRS[i].symbol); };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      height: 44,
      padding: "0 12px",
      gap: 0,
      background: "var(--bg-1)",
      borderBottom: "1px solid var(--border)",
      flexShrink: 0,
      overflow: "hidden",
    }}>
      {/* Pair tabs */}
      <div style={{ display: "flex", gap: 2, marginRight: 16, flexShrink: 0 }}>
        {PAIRS.map((pair, i) => (
          <button
            key={pair.symbol}
            onClick={() => select(i)}
            style={{
              padding: "3px 10px",
              borderRadius: 5,
              fontSize: 12,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              background: sel === i ? "var(--bg-3)" : "transparent",
              color: sel === i ? "var(--text-0)" : "var(--text-2)",
              transition: "background 0.15s",
              flexShrink: 0,
            }}
          >
            {pair.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: "var(--border)", marginRight: 16, flexShrink: 0 }} />

      {/* Price */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginRight: 24, flexShrink: 0 }}>
        <span style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>
          {p.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>
          {up ? "+" : ""}{p.change.toFixed(2)}%
        </span>
      </div>

      {/* Stats */}
      {[
        { label: "24h High", val: p.high.toLocaleString("en-US", { minimumFractionDigits: 2 }) },
        { label: "24h Low",  val: p.low.toLocaleString("en-US",  { minimumFractionDigits: 2 }) },
        { label: "24h Vol",  val: p.vol },
      ].map(({ label, val }) => (
        <div key={label} style={{ display: "flex", flexDirection: "column", gap: 1, marginRight: 20, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: "var(--text-2)" }}>{label}</span>
          <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 500, color: "var(--text-1)" }}>{val}</span>
        </div>
      ))}
    </div>
  );
}
