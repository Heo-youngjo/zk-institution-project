export const ABIS = {
  REGISTRY: [
    {
      inputs: [{ internalType: "address", name: "user", type: "address" }],
      name: "isLoggedIn",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "address", name: "", type: "address" }],
      name: "sessionExpiresAt",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "merkleRoot",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        { internalType: "uint256[2]",    name: "a",     type: "uint256[2]"    },
        { internalType: "uint256[2][2]", name: "b",     type: "uint256[2][2]" },
        { internalType: "uint256[2]",    name: "c",     type: "uint256[2]"    },
        { internalType: "uint256[2]",    name: "input", type: "uint256[2]"    },
      ],
      name: "verifyLogin",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      anonymous: false,
      inputs: [
        { indexed: false, internalType: "uint256", name: "nullifierHash", type: "uint256" },
        { indexed: true,  internalType: "address", name: "user",          type: "address"  },
        { indexed: false, internalType: "uint256", name: "expiresAt",     type: "uint256"  },
      ],
      name: "LoginVerified",
      type: "event",
    },
  ] as const,

  ORDER_GATEWAY: [
    {
      inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
      name: "submitOrder",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "nextOrderId",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  ] as const,

  ORDER_EXECUTOR: [
    // ── write ──────────────────────────────────────────────────────────────────
    {
      inputs: [
        { internalType: "address", name: "tokenIn",     type: "address" },
        { internalType: "address", name: "tokenOut",    type: "address" },
        { internalType: "uint256", name: "totalAmount", type: "uint256" },
        { internalType: "uint256", name: "splitCount",  type: "uint256" },
        { internalType: "uint256", name: "slippageBps", type: "uint256" },
        { internalType: "uint256", name: "deadline",    type: "uint256" },
      ],
      name: "createOrder",
      outputs: [{ internalType: "uint256", name: "orderId", type: "uint256" }],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [{ internalType: "uint256", name: "orderId", type: "uint256" }],
      name: "executeAll",
      outputs: [{ internalType: "uint256", name: "totalOut", type: "uint256" }],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [{ internalType: "uint256", name: "orderId", type: "uint256" }],
      name: "executeChunk",
      outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [{ internalType: "uint256", name: "orderId", type: "uint256" }],
      name: "cancelOrder",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    // ── view ───────────────────────────────────────────────────────────────────
    {
      inputs: [],
      name: "nextOrderId",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "address", name: "user", type: "address" }],
      name: "getUserOrders",
      outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "uint256", name: "orderId", type: "uint256" }],
      name: "getOrderSummary",
      outputs: [
        { internalType: "address",  name: "user",         type: "address"  },
        { internalType: "uint256",  name: "totalAmount",  type: "uint256"  },
        { internalType: "uint256",  name: "splitCount",   type: "uint256"  },
        { internalType: "uint256",  name: "filledChunks", type: "uint256"  },
        { internalType: "uint256",  name: "totalOut",     type: "uint256"  },
        { internalType: "uint256",  name: "deadline",     type: "uint256"  },
        { internalType: "uint8",    name: "status",       type: "uint8"    },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "uint256", name: "orderId", type: "uint256" }],
      name: "getFills",
      outputs: [
        {
          components: [
            { internalType: "uint256", name: "orderId",           type: "uint256" },
            { internalType: "uint256", name: "chunkIndex",        type: "uint256" },
            { internalType: "address", name: "dexPool",           type: "address" },
            { internalType: "uint256", name: "amountIn",          type: "uint256" },
            { internalType: "uint256", name: "amountOut",         type: "uint256" },
            { internalType: "uint256", name: "executedAt",        type: "uint256" },
            { internalType: "uint256", name: "slippageActualBps", type: "uint256" },
          ],
          internalType: "struct OrderExecutor.Fill[]",
          name: "",
          type: "tuple[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "uint256", name: "orderId", type: "uint256" }],
      name: "remainingChunks",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    // ── events ─────────────────────────────────────────────────────────────────
    {
      anonymous: false,
      inputs: [
        { indexed: true,  internalType: "uint256", name: "orderId",     type: "uint256" },
        { indexed: true,  internalType: "address", name: "user",        type: "address"  },
        { indexed: false, internalType: "address", name: "tokenIn",     type: "address"  },
        { indexed: false, internalType: "address", name: "tokenOut",    type: "address"  },
        { indexed: false, internalType: "uint256", name: "totalAmount", type: "uint256"  },
        { indexed: false, internalType: "uint256", name: "splitCount",  type: "uint256"  },
        { indexed: false, internalType: "uint256", name: "deadline",    type: "uint256"  },
      ],
      name: "OrderCreated",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true,  internalType: "uint256", name: "orderId",    type: "uint256" },
        { indexed: false, internalType: "uint256", name: "chunkIndex", type: "uint256" },
        { indexed: false, internalType: "address", name: "dexPool",    type: "address"  },
        { indexed: false, internalType: "uint256", name: "amountIn",   type: "uint256"  },
        { indexed: false, internalType: "uint256", name: "amountOut",  type: "uint256"  },
      ],
      name: "ChunkExecuted",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true,  internalType: "uint256", name: "orderId",  type: "uint256" },
        { indexed: false, internalType: "uint256", name: "totalIn",  type: "uint256" },
        { indexed: false, internalType: "uint256", name: "totalOut", type: "uint256" },
      ],
      name: "OrderFilled",
      type: "event",
    },
  ] as const,

  ERC20: [
    {
      inputs: [
        { internalType: "address", name: "spender", type: "address" },
        { internalType: "uint256", name: "amount",  type: "uint256" },
      ],
      name: "approve",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [{ internalType: "address", name: "account", type: "address" }],
      name: "balanceOf",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        { internalType: "address", name: "owner",   type: "address" },
        { internalType: "address", name: "spender", type: "address" },
      ],
      name: "allowance",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  ] as const,
} as const;
