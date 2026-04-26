import Header from "@/components/Header";
import DexPriceCards from "@/components/DexPriceCards";
import GeckoChart from "@/components/GeckoChart";
import ZkLoginCard from "@/components/ZkLoginCard";
import SessionStatusCard from "@/components/SessionStatusCard";

export default function Home() {
  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--tv-bg-primary)" }}>
      <Header />
      <DexPriceCards />

      {/* 메인 레이아웃 */}
      <div className="flex flex-1 min-h-0">
        {/* 왼쪽: 차트 */}
        <div className="flex-1 min-w-0" style={{ borderRight: "1px solid var(--tv-border)" }}>
          <GeckoChart />
        </div>

        {/* 오른쪽: 패널 (320px 고정) */}
        <div
          className="w-80 shrink-0 flex flex-col overflow-y-auto"
          style={{ background: "var(--tv-bg-secondary)" }}
        >
          <ZkLoginCard />
          <div style={{ borderTop: "1px solid var(--tv-border)" }} />
          <SessionStatusCard />
        </div>
      </div>
    </div>
  );
}
