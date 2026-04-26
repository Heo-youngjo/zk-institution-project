export interface ProofInput {
  root: string;
  nullifierHash: string;
  secret: string;
  nullifier: string;
  pathElements: string[];
  pathIndices: number[];
  [key: string]: unknown;
}

export interface ZkProof {
  a: readonly [bigint, bigint];
  b: readonly [readonly [bigint, bigint], readonly [bigint, bigint]];
  c: readonly [bigint, bigint];
  input: readonly [bigint, bigint];
}

export async function generateProof(input: ProofInput): Promise<ZkProof> {
  const snarkjs = await import("snarkjs");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input as any,
    "/login.wasm",
    "/login_final.zkey"
  );

  const raw: string = await snarkjs.groth16.exportSolidityCallData(
    proof,
    publicSignals
  );

  // exportSolidityCallData returns comma-separated arrays, wrap in [] to parse as JSON
  const [a, b, c, pi] = JSON.parse("[" + raw + "]") as [
    [string, string],
    [[string, string], [string, string]],
    [string, string],
    [string, string],
  ];

  return {
    a: [BigInt(a[0]), BigInt(a[1])],
    b: [
      [BigInt(b[0][0]), BigInt(b[0][1])],
      [BigInt(b[1][0]), BigInt(b[1][1])],
    ],
    c: [BigInt(c[0]), BigInt(c[1])],
    input: [BigInt(pi[0]), BigInt(pi[1])],
  };
}
