"use client";

import { useReadContract } from "wagmi";
import { useConnection } from "wagmi";
import { CONTRACT_ADDRESSES } from "@/constants/addresses";
import { ABIS } from "@/constants/contracts";

export function useSession() {
  const { address } = useConnection();

  const { data: isActive = false, refetch: refetchStatus } = useReadContract({
    address: CONTRACT_ADDRESSES.REGISTRY as `0x${string}`,
    abi: ABIS.REGISTRY,
    functionName: "isLoggedIn",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 30_000 },
  });

  const { data: expiresAt } = useReadContract({
    address: CONTRACT_ADDRESSES.REGISTRY as `0x${string}`,
    abi: ABIS.REGISTRY,
    functionName: "sessionExpiresAt",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isActive },
  });

  const session =
    isActive && expiresAt
      ? {
          id: address ?? "",
          expiresAt: Number(expiresAt),
          isAuthenticated: true,
        }
      : null;

  return { session, isActive, refetchStatus };
}
