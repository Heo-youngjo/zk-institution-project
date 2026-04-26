"use client";

import { useEffect, useRef, useState } from "react";

const INTERVALS = [
  { label: "1m",  value: "1"   },
  { label: "5m",  value: "5"   },
  { label: "15m", value: "15"  },
  { label: "1H",  value: "60"  },
  { label: "4H",  value: "240" },
  { label: "1D",  value: "D"   },
];

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TradingView: any;
  }
}

export default function GeckoChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<unknown>(null);
  const [symbol, setSymbol] = useState("BINANCE:ETHUSDT");
  const [chartInterval, setChartInterval] = useState("60");

  useEffect(() => {
    if (!containerRef.current) return;

    // 기존 위젯 제거
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      if (!containerRef.current || !window.TradingView) return;
      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol,
        chartInterval,
        timezone: "Asia/Seoul",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#1e222d",
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: false,
        container_id: "tv_chart_container",
        backgroundColor: "#131722",
        gridColor: "rgba(42,46,57,0.5)",
        withdateranges: true,
        hide_top_toolbar: false,
        save_image: false,
      });
    };

    const chartDiv = document.createElement("div");
    chartDiv.id = "tv_chart_container";
    chartDiv.style.height = "100%";
    chartDiv.style.width = "100%";
    containerRef.current.appendChild(chartDiv);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [symbol, chartInterval]);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--tv-bg-primary)" }}>
      {/* 심볼/인터벌 툴바 */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 shrink-0"
        style={{ borderBottom: "1px solid var(--tv-border)", background: "var(--tv-bg-secondary)" }}
      >
        {/* 심볼 선택 */}
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="tv-input text-xs px-2 py-1 cursor-pointer"
        >
          <option value="BINANCE:ETHUSDT">ETH/USDT</option>
          <option value="BINANCE:BTCUSDT">BTC/USDT</option>
          <option value="BINANCE:SOLUSDT">SOL/USDT</option>
          <option value="BINANCE:ARBUSD">ARB/USDT</option>
        </select>

        <div className="w-px h-4" style={{ background: "var(--tv-border)" }} />

        {/* 인터벌 선택 */}
        <div className="flex gap-0.5">
          {INTERVALS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setInterval(value)}
              className="px-2 py-0.5 text-xs rounded transition-colors font-medium"
              style={{
                background: chartInterval === value ? "var(--tv-blue)" : "transparent",
                color: chartInterval === value ? "#fff" : "var(--tv-text-muted)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 차트 */}
      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  );
}
