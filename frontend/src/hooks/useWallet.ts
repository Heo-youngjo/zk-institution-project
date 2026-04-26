"use client";

import { useConnection, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

export function useWallet() {
  const { address, isConnected, isConnecting } = useConnection();
  const { mutate: connect } = useConnect();
  const { mutate: disconnect } = useDisconnect();

  return {
    address: address ?? null,
    isConnected,
    isConnecting,
    connect: () => connect({ connector: injected() }),
    disconnect: () => disconnect({}),
  };
}
