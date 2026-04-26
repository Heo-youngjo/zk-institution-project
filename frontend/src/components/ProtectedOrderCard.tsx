"use client";

import { useState } from "react";
import { formatEther } from "viem";
import { useSession } from "@/hooks/useSession";
import { useOrderExecution } from "@/hooks/useOrderExecution";

const STEP_LABEL: Record<string, string> = {
  idle:      "Execute Protected Order",
  approving: "1/3 mUSDC 승인 중...",
  creating:  "2/3 주문 생성 중...",
  executing: "3/3 체결 중...",
  done:      "체결 완료",
  error:     "다시 시도",
};

export default function ProtectedOrderCard() {
  const { isActive } = useSession();
  const { execute, step, error, fill, reset, isLoading } = useOrderExecution();
  const [amount, setAmount] = useState("");

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) return;
    await execute(amount);
  };

  if (!isActive) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 border border-zinc-200 dark:border-zinc-800 text-center space-y-3">
        <p className="text-zinc-400 text-sm">ZK 로그인 후 주문이 가능합니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 border border-zinc-200 dark:border-zinc-800 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Protected Swap</h2>
        <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-1 rounded font-mono">
          단일 집행
        </span>
      </div>

      {/* ── Sell 입력 ── */}
      <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Sell</label>
        <div className="flex justify-between items-center gap-3">
          <input
            type="number"
            placeholder="0.00"
            min="0"
            step="any"
            disabled={isLoading || step === "done"}
            className="bg-transparent text-2xl font-bold focus:outline-none w-full disabled:opacity-50"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); reset(); }}
          />
          <span className="font-bold text-lg shrink-0">mUSDC</span>
        </div>
      </div>

      <div className="flex justify-center -my-2">
        <div className="bg-white dark:bg-zinc-900 border-4 border-zinc-50 dark:border-zinc-800 rounded-full p-2 text-lg">↓</div>
      </div>

      {/* ── Buy 표시 ── */}
      <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Buy (Protected)</label>
        <div className="flex justify-between items-center">
          <span className={`text-2xl font-bold ${fill ? "text-green-600 dark:text-green-400" : "text-zinc-400"}`}>
            {fill ? Number(formatEther(fill.amountOut)).toFixed(6) : "0.000000"}
          </span>
          <span className="font-bold text-lg">mWETH</span>
        </div>
      </div>

      {/* ── 체결 결과 ── */}
      {fill && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-2 text-sm">
          <p className="font-bold text-green-700 dark:text-green-400">✓ 체결 완료</p>
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <span>주문 ID</span>
            <span className="font-mono">#{fill.orderId.toString()}</span>
          </div>
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <span>체결 DEX 풀</span>
            <span className="font-mono text-xs">{fill.dexPool.slice(0, 10)}…</span>
          </div>
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <span>투입</span>
            <span>{Number(formatEther(fill.amountIn)).toFixed(2)} mUSDC</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>수령</span>
            <span>{Number(formatEther(fill.amountOut)).toFixed(6)} mWETH</span>
          </div>
        </div>
      )}

      {/* ── 진행 표시기 ── */}
      {isLoading && (
        <div className="flex gap-2">
          {["approving", "creating", "executing"].map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                ["approving", "creating", "executing"].indexOf(step) >= i
                  ? "bg-blue-500"
                  : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>
      )}

      {/* ── 에러 ── */}
      {error && (
        <p className="text-xs text-red-500 break-all">{error}</p>
      )}

      {/* ── 버튼 ── */}
      <button
        onClick={step === "done" ? reset : handleSubmit}
        disabled={isLoading || (!amount && step === "idle")}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white py-4 rounded-xl font-bold text-lg transition-all"
      >
        {STEP_LABEL[step] ?? "Execute Protected Order"}
      </button>

      <p className="text-xs text-center text-zinc-400">
        슬리피지 0.5% · 만료 1시간 · ZK 세션 인증
      </p>
    </div>
  );
}
