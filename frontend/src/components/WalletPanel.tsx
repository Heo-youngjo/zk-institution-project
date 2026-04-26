"use client";

import { useWallet } from "@/hooks/useWallet";

export default function WalletPanel() {
  const { isConnected, address, connect, disconnect } = useWallet();

  if (isConnected && address) {
    return (
      <button
        onClick={disconnect}
        className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono transition-colors"
        style={{
          background: "var(--tv-bg-tertiary)",
          border: "1px solid var(--tv-border)",
          color: "var(--tv-text-primary)",
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "var(--tv-green)" }}
        />
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      className="px-3 py-1.5 rounded text-xs font-semibold tv-btn-primary"
    >
      Connect Wallet
    </button>
  );
}
