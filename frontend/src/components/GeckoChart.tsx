"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TradingView: any;
  }
}

interface Props {
  symbol?: string;
}

export default function GeckoChart({ symbol = "BINANCE:ETHUSDT" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const chartDiv = document.createElement("div");
    chartDiv.id = "tv_chart_container";
    chartDiv.style.height = "100%";
    chartDiv.style.width = "100%";
    containerRef.current.appendChild(chartDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      if (!containerRef.current || !window.TradingView) return;
      new window.TradingView.widget({
        autosize:           true,
        symbol,
        interval:           "60",
        timezone:           "Asia/Seoul",
        theme:              "dark",
        style:              "1",
        locale:             "en",
        toolbar_bg:         "#141619",
        enable_publishing:  false,
        hide_side_toolbar:  false,
        allow_symbol_change: false,
        container_id:       "tv_chart_container",
        backgroundColor:    "#0d0f12",
        gridColor:          "rgba(42,46,57,0.4)",
        withdateranges:     true,
        hide_top_toolbar:   false,
        save_image:         false,
      });
    };
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [symbol]);

  return <div ref={containerRef} className="w-full h-full" />;
}
