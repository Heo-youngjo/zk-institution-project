"use client";

import { useWallet } from "@/hooks/useWallet";
import { useSession } from "@/hooks/useSession";

export default function WalletPanel() {
  const { isConnected, address, connect, disconnect } = useWallet();
  const { isActive } = useSession();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        {isActive && (
          <span className="badge badge-green text-xs">ZK Active</span>
        )}
        <button
          onClick={disconnect}
          className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono"
          style={{
            background: "var(--bg-3)",
            border: "1px solid var(--border)",
            color: "var(--text-1)",
            cursor: "pointer",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--green)" }} />
          {address.slice(0, 6)}…{address.slice(-4)}
        </button>
      </div>
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
