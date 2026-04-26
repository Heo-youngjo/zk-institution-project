const { buildPoseidon } = require("circomlibjs");
const fs = require("fs");
const csv = require("csv-parser");

async function buildTree() {
    const poseidon = await buildPoseidon();
    const F = poseidon.F;
    const leaves = [];

    // 1. CSV 파일에서 Commitment_Leaf 읽어오기
    fs.createReadStream('agencies_data.csv')
        .pipe(csv())
        .on('data', (row) => {
            leaves.push(BigInt(row.Commitment_Leaf));
        })
        .on('end', async () => {
            console.log(`✅ ${leaves.length}개의 리프를 읽어왔습니다.`);

            // 2. 머클 트리 구성 (이진 트리 방식)
            let currentLevel = leaves;
            let tree = [currentLevel];

            while (currentLevel.length > 1) {
                const nextLevel = [];
                for (let i = 0; i < currentLevel.length; i += 2) {
                    const left = currentLevel[i];
                    // 32개이므로 항상 짝이 맞지만, 만약 홀수라면 마지막 노드를 복사함
                    const right = (i + 1 < currentLevel.length) ? currentLevel[i+1] : currentLevel[i];
                    
                    // 두 노드를 합쳐서 위 층의 노드 생성
                    const parent = poseidon([left, right]);
                    nextLevel.push(parent);
                }
                currentLevel = nextLevel;
                tree.push(currentLevel);
            }

            // 3. 최상위 루트 값 출력
            const root = F.toString(currentLevel[0], 16);
            console.log("------------------------------------------");
            console.log("🔥 최종 머클 루트 (온체인 게시용):");
            console.log("0x" + root);
            console.log("------------------------------------------");
            console.log("이 값을 메모장이나 주석으로 저장해두세요!");
        });
}

buildTree().catch(console.error);