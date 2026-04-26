"use client";

import { useSession } from "@/hooks/useSession";
import { useWallet } from "@/hooks/useWallet";

const MARKET_ITEMS = [
  { label: "ETH/USDC", bid: "2,449.80", ask: "2,450.21", spread: "0.41" },
  { label: "BTC/USDC", bid: "43,118.00", ask: "43,120.50", spread: "2.50" },
  { label: "ARB/USDC", bid: "1.8530", ask: "1.8540", spread: "0.001" },
];

export default function SessionStatusCard() {
  const { isActive } = useSession();
  const { address } = useWallet();

  return (
    <div className="p-4 space-y-4">
      {/* 세션 상태 */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--tv-text-muted)" }}>
          Session
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: isActive ? "var(--tv-green)" : "var(--tv-text-muted)" }}
            />
            <span className="text-xs font-medium" style={{ color: "var(--tv-text-primary)" }}>
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
          {address && (
            <span className="text-xs font-mono" style={{ color: "var(--tv-text-muted)" }}>
              {address.slice(0, 6)}…{address.slice(-4)}
            </span>
          )}
        </div>
      </div>

      {/* Order Book 스타일 호가창 */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--tv-text-muted)" }}>
          Market Depth
        </p>
        <div className="space-y-0.5">
          {/* 헤더 */}
          <div className="grid grid-cols-3 pb-1" style={{ borderBottom: "1px solid var(--tv-border)" }}>
            {["Pair", "Bid", "Ask"].map((h) => (
              <span key={h} className="text-xs" style={{ color: "var(--tv-text-muted)" }}>{h}</span>
            ))}
          </div>
          {MARKET_ITEMS.map((item) => (
            <div key={item.label} className="grid grid-cols-3 py-0.5">
              <span className="text-xs font-medium" style={{ color: "var(--tv-text-primary)" }}>
                {item.label}
              </span>
              <span className="text-xs font-mono" style={{ color: "var(--tv-green)" }}>
                {item.bid}
              </span>
              <span className="text-xs font-mono" style={{ color: "var(--tv-red)" }}>
                {item.ask}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 시스템 정보 */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--tv-text-muted)" }}>
          System
        </p>
        {[
          { label: "Network",  value: "Hardhat Local" },
          { label: "Chain ID", value: "31337"          },
          { label: "Privacy",  value: "ZK Groth16"     },
          { label: "Splits",   value: "Round-Robin"    },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between">
            <span className="text-xs" style={{ color: "var(--tv-text-muted)" }}>{label}</span>
            <span className="text-xs font-mono" style={{ color: "var(--tv-text-primary)" }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
