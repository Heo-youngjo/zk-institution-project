"use client";

import { useState } from "react";
import Header from "@/components/Header";
import DexPriceCards from "@/components/DexPriceCards";
import PairStatsBar from "@/components/PairStatsBar";
import OrderBook from "@/components/OrderBook";
import GeckoChart from "@/components/GeckoChart";
import TradePanel from "@/components/TradePanel";

export default function Home() {
  const [symbol, setSymbol] = useState("BINANCE:ETHUSDT");

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--bg-0)" }}>
      <Header />
      <DexPriceCards />

      <div className="flex flex-1 min-h-0">

        {/* ── Left: PairStats + Chart ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <PairStatsBar onSymbolChange={setSymbol} />
          <div className="flex-1 min-h-0">
            <GeckoChart symbol={symbol} />
          </div>
        </div>

        {/* ── Right panel: Order Book (top) + Trade Form (bottom) ── */}
        <div
          className="shrink-0 flex flex-col"
          style={{ width: 300, borderLeft: "1px solid var(--border)" }}
        >
          {/* Order Book — top 55% */}
          <div style={{ flex: 55, minHeight: 0, borderBottom: "1px solid var(--border)", overflow: "hidden" }}>
            <OrderBook />
          </div>
          {/* Trade Form — bottom 45% */}
          <div style={{ flex: 45, minHeight: 0, overflow: "hidden" }}>
            <TradePanel />
          </div>
        </div>

      </div>
    </div>
  );
}
