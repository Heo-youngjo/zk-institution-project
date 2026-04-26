"use client";

import { useState } from "react";
import { useWriteContract, usePublicClient, useConnection } from "wagmi";
import { parseEther, parseEventLogs, type Abi } from "viem";
import { CONTRACT_ADDRESSES } from "@/constants/addresses";
import { ABIS } from "@/constants/contracts";

export type OrderStep = "idle" | "approving" | "creating" | "executing" | "done" | "error";

export interface FillResult {
  orderId: bigint;
  amountIn: bigint;
  amountOut: bigint;
  dexPool: string;
}

export function useOrderExecution() {
  const { address } = useConnection();
  const publicClient = usePublicClient();
  const { mutateAsync: writeContract } = useWriteContract();

  const [step, setStep] = useState<OrderStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fill, setFill] = useState<FillResult | null>(null);

  const execute = async (amountEther: string) => {
    if (!address || !publicClient) return;

    const executor = CONTRACT_ADDRESSES.ORDER_EXECUTOR;
    const tokenIn  = CONTRACT_ADDRESSES.TOKEN_IN;
    const tokenOut = CONTRACT_ADDRESSES.TOKEN_OUT;

    if (!executor || !tokenIn || !tokenOut) {
      setError("컨트랙트 주소가 설정되지 않았습니다. deploy_executor.js를 먼저 실행하세요.");
      setStep("error");
      return;
    }

    const amount   = parseEther(amountEther);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // +1 hour

    setError(null);
    setFill(null);

    try {
      // ── 1. Approve tokenIn → OrderExecutor ────────────────────────────────
      setStep("approving");
      const approveTx = await writeContract({
        address: tokenIn,
        abi: ABIS.ERC20,
        functionName: "approve",
        args: [executor, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });

      // ── 2. createOrder (splitCount = 1 for single execution) ──────────────
      setStep("creating");
      const createTx = await writeContract({
        address: executor,
        abi: ABIS.ORDER_EXECUTOR,
        functionName: "createOrder",
        args: [tokenIn, tokenOut, amount, 1n, 50n, deadline],
      });
      const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createTx });

      // orderId를 OrderCreated 이벤트에서 파싱
      const logs = parseEventLogs({
        abi: ABIS.ORDER_EXECUTOR as Abi,
        eventName: "OrderCreated",
        logs: createReceipt.logs,
      });
      const orderId = (logs[0] as { args: { orderId: bigint } }).args.orderId;

      // ── 3. executeAll → 단일 청크 실행 ────────────────────────────────────
      setStep("executing");
      const execTx = await writeContract({
        address: executor,
        abi: ABIS.ORDER_EXECUTOR,
        functionName: "executeAll",
        args: [orderId],
      });
      const execReceipt = await publicClient.waitForTransactionReceipt({ hash: execTx });

      // ChunkExecuted 이벤트에서 체결 결과 파싱
      const fillLogs = parseEventLogs({
        abi: ABIS.ORDER_EXECUTOR as Abi,
        eventName: "ChunkExecuted",
        logs: execReceipt.logs,
      });

      if (fillLogs.length > 0) {
        const args = (fillLogs[0] as {
          args: { orderId: bigint; amountIn: bigint; amountOut: bigint; dexPool: string };
        }).args;
        setFill({
          orderId:   args.orderId,
          amountIn:  args.amountIn,
          amountOut: args.amountOut,
          dexPool:   args.dexPool,
        });
      }

      setStep("done");
    } catch (e) {
      setStep("error");
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    }
  };

  const reset = () => {
    setStep("idle");
    setError(null);
    setFill(null);
  };

  return { execute, step, error, fill, reset, isLoading: !["idle", "done", "error"].includes(step) };
}
