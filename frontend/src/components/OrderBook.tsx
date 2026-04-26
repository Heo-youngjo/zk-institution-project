"use client";

const BASE = 2450.55;
const TICK = 0.20;

const RAW_ASKS = [
  { price: BASE + TICK * 8, size: 2.841 },
  { price: BASE + TICK * 7, size: 0.620 },
  { price: BASE + TICK * 6, size: 1.305 },
  { price: BASE + TICK * 5, size: 0.980 },
  { price: BASE + TICK * 4, size: 3.412 },
  { price: BASE + TICK * 3, size: 0.724 },
  { price: BASE + TICK * 2, size: 1.891 },
  { price: BASE + TICK * 1, size: 0.530 },
];

const RAW_BIDS = [
  { price: BASE - TICK * 1, size: 1.204 },
  { price: BASE - TICK * 2, size: 2.780 },
  { price: BASE - TICK * 3, size: 0.441 },
  { price: BASE - TICK * 4, size: 1.620 },
  { price: BASE - TICK * 5, size: 0.890 },
  { price: BASE - TICK * 6, size: 3.100 },
  { price: BASE - TICK * 7, size: 0.760 },
  { price: BASE - TICK * 8, size: 1.540 },
];

// cumulative totals — asks from lowest upward, bids from highest downward
function withCumulative(rows: typeof RAW_ASKS, reverse = false) {
  const src = reverse ? [...rows].reverse() : rows;
  let cum = 0;
  return src.map(r => { cum += r.size; return { ...r, cum }; });
}

const ASKS = withCumulative(RAW_ASKS, true);   // lowest ask first → cumulates upward
const BIDS = withCumulative(RAW_BIDS, false);  // highest bid first → cumulates downward
const maxCum = Math.max(ASKS[ASKS.length - 1]?.cum ?? 1, BIDS[BIDS.length - 1]?.cum ?? 1);

function f2(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function f3(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }); }

const COL = "gridTemplateColumns: '1fr 1fr 1fr'";
void COL;

function Row({ price, size, cum, side }: { price: number; size: number; cum: number; side: "ask" | "bid" }) {
  const pct = (cum / maxCum) * 100;
  const isAsk = side === "ask";

  return (
    <div style={{ position: "relative", height: 20, overflow: "hidden" }}>
      {/* depth bar */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        width: `${pct}%`,
        background: isAsk ? "rgba(255,75,85,0.10)" : "rgba(0,192,118,0.10)",
        transition: "width 0.2s",
      }} />
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        height: "100%",
        alignItems: "center",
        padding: "0 8px",
        position: "relative",
        gap: 0,
      }}>
        <span style={{ fontFamily: "monospace", fontSize: 11, color: isAsk ? "var(--red)" : "var(--green)" }}>
          {f2(price)}
        </span>
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-1)", textAlign: "right" }}>
          {f3(size)}
        </span>
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-2)", textAlign: "right" }}>
          {f3(cum)}
        </span>
      </div>
    </div>
  );
}

export default function OrderBook() {
  const spread = (BASE + TICK * 1 - (BASE - TICK * 1)).toFixed(2);
  const spreadPct = ((+spread / BASE) * 100).toFixed(4);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-1)" }}>

      {/* Tab header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        borderBottom: "1px solid var(--border)",
        padding: "0 8px",
        flexShrink: 0,
        height: 34,
        gap: 4,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-0)", borderBottom: "2px solid var(--blue)", paddingBottom: 6, paddingTop: 8 }}>
          Order Book
        </span>
        <span style={{ fontSize: 12, color: "var(--text-2)", marginLeft: 8, paddingBottom: 6, paddingTop: 8, cursor: "pointer" }}>
          Trades
        </span>
      </div>

      {/* Column headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        padding: "4px 8px",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, color: "var(--text-2)" }}>Price(USDT)</span>
        <span style={{ fontSize: 10, color: "var(--text-2)", textAlign: "right" }}>Size(ETH)</span>
        <span style={{ fontSize: 10, color: "var(--text-2)", textAlign: "right" }}>Total(ETH)</span>
      </div>

      {/* Asks — lowest ask at bottom (justify-end) */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end", borderBottom: "1px solid var(--border)" }}>
        {[...ASKS].reverse().map(row => (
          <Row key={row.price} {...row} side="ask" />
        ))}
      </div>

      {/* Spread */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "4px 8px",
        background: "var(--bg-2)",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "var(--green)" }}>
          {f2(BASE)}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-2)" }}>
          Spread {spread} · {spreadPct}%
        </span>
      </div>

      {/* Bids */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {BIDS.map(row => (
          <Row key={row.price} {...row} side="bid" />
        ))}
      </div>
    </div>
  );
}
