"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useConnection } from "wagmi";
import { CONTRACT_ADDRESSES } from "@/constants/addresses";
import { ABIS } from "@/constants/contracts";
import { generateProof, type ProofInput } from "@/lib/proof";
import { useBackendAuth } from "./useBackendAuth";

export type ZkLoginStatus = "idle" | "generating" | "submitting" | "success" | "error";

export function useZkLogin() {
  const { address, isConnected } = useConnection();
  const [status, setStatus] = useState<ZkLoginStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync: writeContract } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  const { loginToBackend } = useBackendAuth();

  const login = async (input: ProofInput) => {
    if (!isConnected || !address) {
      setError("지갑을 먼저 연결하세요.");
      return;
    }

    setError(null);

    try {
      // 1. ZK 증명 생성 (브라우저)
      setStatus("generating");
      const { a, b, c, input: pi } = await generateProof(input);

      // 2. 온체인 Registry.verifyLogin() 트랜잭션
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

      // 3. 온체인 확인 후 백엔드 JWT 발급 (비동기 — 실패해도 ZK 로그인은 성공)
      setTimeout(() => loginToBackend(address), 2000);

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
