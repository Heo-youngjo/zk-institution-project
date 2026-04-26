"use client";

import { useEffect, useState } from "react";
import { useBackendAuth } from "@/hooks/useBackendAuth";
import Header from "@/components/Header";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

interface Order {
  orderId:      string;
  totalAmount:  string;
  splitCount:   number;
  filledChunks: number;
  totalOut:     string;
  deadline:     number;
  status:       string;
  progress:     number;
}

interface Fill {
  orderId:    string;
  chunkIndex: number;
  dexPool:    string;
  amountIn:   string;
  amountOut:  string;
  executedAt: number;
}

interface Portfolio {
  totalOrders:  number;
  filledOrders: number;
  activeOrders: number;
  totalIn:      string;
  totalOut:     string;
  recentFills:  Fill[];
}

const STATUS_COLOR: Record<string, string> = {
  Filled:    "var(--green)",
  Active:    "var(--blue)",
  Pending:   "var(--yellow)",
  Cancelled: "var(--text-2)",
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 18px" }}>
      <p style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace", color: "var(--text-0)" }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { isAuthed, authFetch, session } = useBackendAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [orders, setOrders]       = useState<Order[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthed) return;
    setLoading(true);
    setError(null);

    Promise.all([
      authFetch(`${BACKEND}/api/portfolio`).then(r => r.json()),
      authFetch(`${BACKEND}/api/orders`).then(r => r.json()),
    ])
      .then(([pf, od]) => {
        setPortfolio(pf);
        setOrders(od.orders ?? []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [isAuthed, authFetch]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg-0)" }}>
      <Header />

      <div style={{ flex: 1, padding: "24px 32px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        {/* Page title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-0)", marginBottom: 4 }}>Portfolio</h1>
          {session && (
            <p style={{ fontSize: 11, color: "var(--text-2)", fontFamily: "monospace" }}>
              {session.address}
            </p>
          )}
        </div>

        {/* Not authenticated */}
        {!isAuthed && (
          <div style={{
            background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 8,
            padding: 32, textAlign: "center",
          }}>
            <p style={{ fontSize: 13, color: "var(--text-1)", marginBottom: 8 }}>ZK 인증이 필요합니다.</p>
            <p style={{ fontSize: 11, color: "var(--text-2)" }}>
              메인 페이지에서 ZK Auth 탭 → Authenticate 후 돌아오세요.
            </p>
          </div>
        )}

        {isAuthed && loading && (
          <p style={{ fontSize: 12, color: "var(--text-2)" }}>불러오는 중…</p>
        )}

        {isAuthed && error && (
          <div style={{ background: "var(--red-bg)", border: "1px solid rgba(255,75,85,0.2)", borderRadius: 6, padding: 12 }}>
            <p style={{ fontSize: 12, color: "var(--red)" }}>{error}</p>
            <p style={{ fontSize: 11, color: "var(--text-2)", marginTop: 4 }}>Hardhat 노드와 백엔드가 실행 중인지 확인하세요.</p>
          </div>
        )}

        {isAuthed && portfolio && (
          <>
            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
              <StatCard label="Total Orders"  value={String(portfolio.totalOrders)} />
              <StatCard label="Filled"        value={String(portfolio.filledOrders)} />
              <StatCard label="Active"        value={String(portfolio.activeOrders)} />
              <StatCard label="Total In"      value={portfolio.totalIn}  sub="USDT" />
              <StatCard label="Total Out"     value={portfolio.totalOut} sub="ETH"  />
            </div>

            {/* Orders table */}
            <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 24, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-0)" }}>Order History</span>
              </div>

              {orders.length === 0 ? (
                <p style={{ padding: 24, fontSize: 12, color: "var(--text-2)", textAlign: "center" }}>
                  주문 내역이 없습니다.
                </p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Order ID", "Amount In", "Amount Out", "Progress", "Status", "Deadline"].map(h => (
                        <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, color: "var(--text-2)", fontWeight: 500 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.orderId} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: 12, color: "var(--text-1)" }}>#{o.orderId}</td>
                        <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: 12, color: "var(--text-0)" }}>{o.totalAmount} USDT</td>
                        <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: 12, color: "var(--green)" }}>{o.totalOut} ETH</td>
                        <td style={{ padding: "10px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--bg-4)" }}>
                              <div style={{ width: `${o.progress}%`, height: "100%", borderRadius: 2, background: "var(--blue)" }} />
                            </div>
                            <span style={{ fontSize: 11, color: "var(--text-2)", fontFamily: "monospace", flexShrink: 0 }}>
                              {o.filledChunks}/{o.splitCount}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLOR[o.status] ?? "var(--text-1)" }}>
                            {o.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: 11, color: "var(--text-2)", fontFamily: "monospace" }}>
                          {new Date(o.deadline * 1000).toLocaleString("ko-KR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Recent fills */}
            {portfolio.recentFills.length > 0 && (
              <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-0)" }}>Recent Fills</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Order", "Chunk", "DEX Pool", "Amount In", "Amount Out", "Time"].map(h => (
                        <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, color: "var(--text-2)", fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.recentFills.map((f, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 16px", fontFamily: "monospace", fontSize: 12, color: "var(--text-1)" }}>#{f.orderId}</td>
                        <td style={{ padding: "8px 16px", fontFamily: "monospace", fontSize: 12, color: "var(--text-2)" }}>{f.chunkIndex}</td>
                        <td style={{ padding: "8px 16px", fontFamily: "monospace", fontSize: 11, color: "var(--text-2)" }}>
                          {f.dexPool.slice(0, 6)}…{f.dexPool.slice(-4)}
                        </td>
                        <td style={{ padding: "8px 16px", fontFamily: "monospace", fontSize: 12, color: "var(--text-0)" }}>{f.amountIn} USDT</td>
                        <td style={{ padding: "8px 16px", fontFamily: "monospace", fontSize: 12, color: "var(--green)" }}>{f.amountOut} ETH</td>
                        <td style={{ padding: "8px 16px", fontSize: 11, color: "var(--text-2)" }}>
                          {new Date(f.executedAt * 1000).toLocaleString("ko-KR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
