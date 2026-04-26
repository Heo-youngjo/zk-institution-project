"use client";

import { useRef, useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useSession } from "@/hooks/useSession";
import { useZkLogin } from "@/hooks/useZkLogin";
import { useOrderExecution } from "@/hooks/useOrderExecution";
import type { ProofInput } from "@/lib/proof";

const EXEC_LABEL: Record<string, string> = {
  idle:      "Execute Order",
  approving: "Approving…",
  creating:  "Creating…",
  executing: "Executing…",
  done:      "Done",
  error:     "Retry",
};

export default function TradePanel() {
  const { isConnected, connect } = useWallet();
  const { isActive, session, refetchStatus } = useSession();
  const { login, status: loginStatus, error: loginError, isLoading: loginLoading } = useZkLogin();
  const { execute, step, error: execError, fill, reset, isLoading: execLoading } = useOrderExecution();

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const estimated = amount ? (parseFloat(amount) / 2450.55).toFixed(6) : "—";

  // ── ZK Login handlers ──────────────────────────────────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError(null);
    const f = e.target.files?.[0];
    if (f) setFileName(f.name);
  };
  const handleLogin = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f) { setParseError("Select input JSON"); return; }
    let input: ProofInput;
    try { input = JSON.parse(await f.text()) as ProofInput; }
    catch { setParseError("Invalid JSON"); return; }
    await login(input);
    refetchStatus();
  };

  // ── Filled result view ─────────────────────────────────────────────────────
  if (fill) {
    const amtIn  = (Number(fill.amountIn)  / 1e18).toFixed(4);
    const amtOut = (Number(fill.amountOut) / 1e18).toFixed(6);
    return (
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, height: "100%", overflow: "auto" }}>
        <div style={{ background: "var(--green-bg)", border: "1px solid rgba(0,192,118,0.25)", borderRadius: 6, padding: 10 }}>
          <p style={{ color: "var(--green)", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Order Filled ✓</p>
          {[["Spent", `${amtIn} USDT`], ["Received", `${amtOut} ETH`], ["Pool", `${fill.dexPool.slice(0,6)}…${fill.dexPool.slice(-4)}`]].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: "var(--text-2)" }}>{l}</span>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-0)" }}>{v}</span>
            </div>
          ))}
        </div>
        <button onClick={reset} className="btn-ghost" style={{ padding: "7px 0", fontSize: 12, width: "100%" }}>
          New Order
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "var(--bg-1)" }}>

      {/* Buy / Sell tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        {(["buy", "sell"] as const).map(s => (
          <button
            key={s}
            onClick={() => setSide(s)}
            style={{
              flex: 1,
              padding: "8px 0",
              fontSize: 12,
              fontWeight: 600,
              textTransform: "capitalize",
              border: "none",
              cursor: "pointer",
              background: side === s ? (s === "buy" ? "var(--green)" : "var(--red)") : "transparent",
              color: side === s ? "#fff" : "var(--text-2)",
              transition: "background 0.15s",
            }}
          >
            {s === "buy" ? "Buy / Long" : "Sell / Short"}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 8px" }}>

        {/* ZK Auth status */}
        {isActive && session ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "5px 8px", borderRadius: 5, marginBottom: 8,
            background: "var(--green-bg)", border: "1px solid rgba(0,192,118,0.2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--green)" }}>ZK Verified</span>
            </div>
            {(() => {
              const rem = Math.max(0, session.expiresAt - Math.floor(Date.now() / 1000));
              return <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text-2)" }}>
                {String(Math.floor(rem / 3600)).padStart(2, "0")}:{String(Math.floor((rem % 3600) / 60)).padStart(2, "0")} left
              </span>;
            })()}
          </div>
        ) : !isConnected ? (
          <button onClick={connect} className="btn-buy" style={{ width: "100%", padding: "8px 0", fontSize: 12, marginBottom: 8 }}>
            Connect Wallet
          </button>
        ) : (
          /* ZK Login form */
          <div style={{ marginBottom: 8 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: "1px dashed var(--border-2)", borderRadius: 6,
                padding: "7px 10px", cursor: "pointer", marginBottom: 6,
                background: "var(--bg-3)", textAlign: "center",
              }}
            >
              <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleFile} />
              <span style={{ fontSize: 11, color: fileName ? "var(--text-0)" : "var(--text-2)" }}>
                {fileName ?? "Upload input_X.json"}
              </span>
            </div>
            {(parseError ?? loginError) && (
              <p style={{ fontSize: 11, color: "var(--red)", marginBottom: 4 }}>{parseError ?? loginError}</p>
            )}
            <button
              onClick={handleLogin}
              disabled={loginLoading}
              className="tv-btn-primary"
              style={{ width: "100%", padding: "7px 0", fontSize: 12 }}
            >
              {loginLoading ? (loginStatus === "generating" ? "Generating proof…" : "Submitting…") : "Authenticate with ZK-ID"}
            </button>
          </div>
        )}

        {/* Available */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-2)" }}>Available</span>
          <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-1)" }}>1,000.00 USDT</span>
        </div>

        {/* Amount input */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 3 }}>Amount (USDT)</div>
          <div style={{ position: "relative" }}>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={!isActive || execLoading}
              className="ex-input"
              style={{ width: "100%", padding: "7px 60px 7px 8px", fontSize: 13 }}
            />
            <div style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 2 }}>
              {["50%", "Max"].map(p => (
                <button
                  key={p}
                  onClick={() => setAmount(p === "Max" ? "1000" : "500")}
                  style={{ fontSize: 10, padding: "2px 5px", borderRadius: 3, background: "var(--bg-4)", color: "var(--text-2)", border: "none", cursor: "pointer" }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Est. details */}
        <div style={{ background: "var(--bg-3)", borderRadius: 6, padding: "7px 9px", marginBottom: 6 }}>
          {[
            ["Est. Receive", `${estimated} ETH`],
            ["Price Impact", "< 0.01%"],
            ["Slippage", "0.5%"],
          ].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 11, color: "var(--text-2)" }}>{l}</span>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-0)" }}>{v}</span>
            </div>
          ))}
        </div>

        {/* ZK badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 9px", borderRadius: 5, marginBottom: 8,
          background: "var(--blue-bg)", border: "1px solid rgba(59,130,246,0.2)",
        }}>
          <span style={{ fontSize: 11, color: "var(--blue)" }}>⚡ ZK Split Execution · Privacy Preserved</span>
        </div>

        {/* Step progress */}
        {execLoading && (
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", gap: 3, marginBottom: 3 }}>
              {["approving", "creating", "executing"].map((s, i) => (
                <div key={s} style={{ flex: 1, height: 2, borderRadius: 1, background: ["approving","creating","executing"].indexOf(step) >= i ? "var(--blue)" : "var(--border)" }} />
              ))}
            </div>
            <span style={{ fontSize: 11, color: "var(--text-2)" }}>{EXEC_LABEL[step]}</span>
          </div>
        )}

        {execError && <p style={{ fontSize: 11, color: "var(--red)", marginBottom: 6 }}>{execError}</p>}

        {/* Submit */}
        <button
          onClick={() => isActive && amount && execute(amount)}
          disabled={execLoading || !isActive || !amount}
          className={side === "buy" ? "btn-buy" : "btn-sell"}
          style={{ width: "100%", padding: "9px 0", fontSize: 13 }}
        >
          {execLoading ? EXEC_LABEL[step] : (isActive ? `${side === "buy" ? "Buy" : "Sell"} ETH` : "ZK Authentication Required")}
        </button>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "5px 10px", flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: "var(--text-2)" }}>ZK Groth16 · Hardhat Local · Round-Robin DEX</span>
      </div>
    </div>
  );
}
