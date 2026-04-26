const fs = require("fs");
const csv = require("csv-parser");
const { buildPoseidon } = require("circomlibjs");

function readCsv(file) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(file)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

(async () => {
  const targetIndex = Number(process.argv[2] ?? "0");

  const poseidon = await buildPoseidon();
  const F = poseidon.F;

  // Poseidon 결과를 "반드시 BigInt"로 고정
  const H1 = (x) => F.toObject(poseidon([x]));
  const H2 = (a, b) => F.toObject(poseidon([a, b]));

  const rows = await readCsv("data/agencies_data.csv");

  // CSV leaf(0x...) -> BigInt
  const leaves = rows.map((r) => BigInt(r.Commitment_Leaf));

  const secret = BigInt(rows[targetIndex].Secret_Key_SK);
  const nullifier = BigInt(rows[targetIndex].Identity_Nullifier_IDN);

  // nullifierHash = Poseidon(nullifier)
  const nullifierHash = H1(nullifier);

  // Merkle proof 생성
  let idx = targetIndex;
  let level = leaves.slice(); // BigInt 배열 유지
  const pathElements = [];
  const pathIndices = [];

  while (level.length > 1) {
    const isRight = idx % 2; // 0: left, 1: right
    const siblingIndex = isRight ? idx - 1 : idx + 1;

    pathElements.push(level[siblingIndex]); // BigInt
    pathIndices.push(isRight);

    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      // parent = Poseidon(left,right) -> BigInt로 강제
      next.push(H2(level[i], level[i + 1]));
    }

    level = next;
    idx = Math.floor(idx / 2);
  }

  const root = level[0]; // BigInt

  const input = {
    root: root.toString(),                 // ✅ decimal string (콤마 없음)
    nullifierHash: nullifierHash.toString(),
    secret: secret.toString(),
    nullifier: nullifier.toString(),
    pathElements: pathElements.map((x) => x.toString()),
    pathIndices
  };

  const outPath = `data/input_${targetIndex}.json`;
  fs.writeFileSync(outPath, JSON.stringify(input, null, 2));

  console.log(`✅ done: ${outPath}`);
  console.log("levels =", pathElements.length); // 5여야 정상
  console.log("root(hex) =", "0x" + root.toString(16));
})();
