import { createPublicClient, http, isAddress } from "viem";
import { hardhat } from "viem/chains";
import * as fs from "fs";
import * as path from "path";

const deployed = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../../../data/deployed.json"), "utf-8"),
);
const EXECUTOR_ADDRESS = deployed.orderExecutor as `0x${string}`;

const EXECUTOR_ABI = [
  {
    name: "getUserOrders",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "getOrderSummary",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "orderId", type: "uint256" }],
    outputs: [
      { name: "user",         type: "address" },
      { name: "totalAmount",  type: "uint256" },
      { name: "splitCount",   type: "uint256" },
      { name: "filledChunks", type: "uint256" },
      { name: "totalOut",     type: "uint256" },
      { name: "deadline",     type: "uint256" },
      { name: "status",       type: "uint8"   },
    ],
  },
  {
    name: "getFills",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "orderId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "orderId",           type: "uint256" },
          { name: "chunkIndex",        type: "uint256" },
          { name: "dexPool",           type: "address" },
          { name: "amountIn",          type: "uint256" },
          { name: "amountOut",         type: "uint256" },
          { name: "executedAt",        type: "uint256" },
          { name: "slippageActualBps", type: "uint256" },
        ],
      },
    ],
  },
] as const;

const client = createPublicClient({
  chain: hardhat,
  transport: http(process.env.RPC_URL ?? "http://127.0.0.1:8545"),
});

const ORDER_STATUS = ["Pending", "Active", "Filled", "Cancelled"] as const;

export interface OrderSummary {
  orderId:      string;
  user:         string;
  totalAmount:  string;
  splitCount:   number;
  filledChunks: number;
  totalOut:     string;
  deadline:     number;
  status:       string;
  progress:     number; // 0~100%
}

export interface Fill {
  orderId:           string;
  chunkIndex:        number;
  dexPool:           string;
  amountIn:          string;
  amountOut:         string;
  executedAt:        number;
  slippageActualBps: number;
}

function bigintToEther(v: bigint): string {
  const eth = Number(v) / 1e18;
  return eth.toFixed(6);
}

export async function getUserOrderIds(address: string): Promise<string[]> {
  if (!isAddress(address)) throw new Error("유효하지 않은 주소");
  const ids = await client.readContract({
    address: EXECUTOR_ADDRESS,
    abi: EXECUTOR_ABI,
    functionName: "getUserOrders",
    args: [address as `0x${string}`],
  }) as bigint[];
  return ids.map(id => id.toString());
}

export async function getOrderSummary(orderId: string): Promise<OrderSummary> {
  const result = await client.readContract({
    address: EXECUTOR_ADDRESS,
    abi: EXECUTOR_ABI,
    functionName: "getOrderSummary",
    args: [BigInt(orderId)],
  }) as [string, bigint, bigint, bigint, bigint, bigint, number];

  const [user, totalAmount, splitCount, filledChunks, totalOut, deadline, statusCode] = result;
  const sc = Number(splitCount);
  const fc = Number(filledChunks);

  return {
    orderId,
    user,
    totalAmount:  bigintToEther(totalAmount),
    splitCount:   sc,
    filledChunks: fc,
    totalOut:     bigintToEther(totalOut),
    deadline:     Number(deadline),
    status:       ORDER_STATUS[statusCode] ?? "Unknown",
    progress:     sc > 0 ? Math.round((fc / sc) * 100) : 0,
  };
}

export async function getOrderFills(orderId: string): Promise<Fill[]> {
  const fills = await client.readContract({
    address: EXECUTOR_ADDRESS,
    abi: EXECUTOR_ABI,
    functionName: "getFills",
    args: [BigInt(orderId)],
  }) as Array<{
    orderId: bigint; chunkIndex: bigint; dexPool: string;
    amountIn: bigint; amountOut: bigint; executedAt: bigint; slippageActualBps: bigint;
  }>;

  return fills.map(f => ({
    orderId:           f.orderId.toString(),
    chunkIndex:        Number(f.chunkIndex),
    dexPool:           f.dexPool,
    amountIn:          bigintToEther(f.amountIn),
    amountOut:         bigintToEther(f.amountOut),
    executedAt:        Number(f.executedAt),
    slippageActualBps: Number(f.slippageActualBps),
  }));
}
