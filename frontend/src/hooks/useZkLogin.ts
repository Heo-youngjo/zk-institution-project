"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useConnection } from "wagmi";
import { CONTRACT_ADDRESSES } from "@/constants/addresses";
import { ABIS } from "@/constants/contracts";
import { generateProof, type ProofInput } from "@/lib/proof";

export type ZkLoginStatus = "idle" | "generating" | "submitting" | "success" | "error";

export function useZkLogin() {
  const { isConnected } = useConnection();
  const [status, setStatus] = useState<ZkLoginStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync: writeContract } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  const login = async (input: ProofInput) => {
    if (!isConnected) {
      setError("지갑을 먼저 연결하세요.");
      return;
    }

    setError(null);

    try {
      setStatus("generating");
      const { a, b, c, input: pi } = await generateProof(input);

      setStatus("submitting");
      const hash = await writeContract({
        address: CONTRACT_ADDRESSES.REGISTRY as `0x${string}`,
        abi: ABIS.REGISTRY,
        functionName: "verifyLogin",
        args: [a, b, c, pi] as readonly [
          readonly [bigint, bigint],
          readonly [readonly [bigint, bigint], readonly [bigint, bigint]],
          readonly [bigint, bigint],
          readonly [bigint, bigint],
        ],
      });

      setTxHash(hash);
      setStatus("success");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    }
  };

  return {
    login,
    status,
    error,
    isLoading: status === "generating" || status === "submitting" || isConfirming,
  };
}
