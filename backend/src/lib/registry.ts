import { createPublicClient, http, isAddress } from "viem";
import { hardhat } from "viem/chains";
import * as fs from "fs";
import * as path from "path";

// deployed.json에서 Registry 주소 읽기
const deployedPath = path.resolve(__dirname, "../../../data/deployed.json");
const deployed = JSON.parse(fs.readFileSync(deployedPath, "utf-8"));
const REGISTRY_ADDRESS = deployed.registry as `0x${string}`;

const REGISTRY_ABI = [
  {
    name: "isLoggedIn",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "sessionExpiresAt",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const client = createPublicClient({
  chain: hardhat,
  transport: http(process.env.RPC_URL ?? "http://127.0.0.1:8545"),
});

export interface SessionInfo {
  address: string;
  isLoggedIn: boolean;
  expiresAt: number;
}

export async function getSessionInfo(address: string): Promise<SessionInfo> {
  if (!isAddress(address)) {
    throw new Error("유효하지 않은 이더리움 주소입니다.");
  }

  const [isLoggedIn, expiresAtBig] = await Promise.all([
    client.readContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "isLoggedIn",
      args: [address as `0x${string}`],
    }),
    client.readContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "sessionExpiresAt",
      args: [address as `0x${string}`],
    }),
  ]);

  return {
    address,
    isLoggedIn: isLoggedIn as boolean,
    expiresAt: Number(expiresAtBig),
  };
}
