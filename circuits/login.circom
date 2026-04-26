pragma circom 2.0.0;

// Poseidon은 설치되어 있으니 이것만 불러옵니다.
include "poseidon.circom";

// [내장 템플릿] Merkle Tree의 한 층을 계산 (두 노드를 합쳐 상위 노드 생성)
template HashLeftRight() {
    signal input left;
    signal input right;
    signal output hash;

    component hasher = Poseidon(2);
    hasher.inputs[0] <== left;
    hasher.inputs[1] <== right;
    hash <== hasher.out;
}

// [내장 템플릿] 머클 트리 포함 여부 검증 로직
template MerkleTreeChecker(n_levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[n_levels];
    signal input pathIndices[n_levels];

    signal hashes[n_levels + 1];
    hashes[0] <== leaf;

    component selectors[n_levels];
    component stepHashes[n_levels];

    for (var i = 0; i < n_levels; i++) {
        stepHashes[i] = HashLeftRight();

        // pathIndices가 0이면 내가 왼쪽, 1이면 내가 오른쪽
        stepHashes[i].left <== hashes[i] + pathIndices[i] * (pathElements[i] - hashes[i]);
        stepHashes[i].right <== pathElements[i] + pathIndices[i] * (hashes[i] - pathElements[i]);

        hashes[i+1] <== stepHashes[i].hash;
    }

    root === hashes[n_levels];
}

// [메인 템플릿]
template LoginProof(levels) {
    signal input root;
    signal input nullifierHash;
    signal input secret;
    signal input nullifier;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    // 1. Leaf 생성
    component leafHasher = Poseidon(2);
    leafHasher.inputs[0] <== secret;
    leafHasher.inputs[1] <== nullifier;

    // 2. NullifierHash 검증
    component nHash = Poseidon(1);
    nHash.inputs[0] <== nullifier;
    nHash.out === nullifierHash;

    // 3. 머클 트리 검증
    component tree = MerkleTreeChecker(levels);
    tree.leaf <== leafHasher.out;
    tree.root <== root;
    for (var i = 0; i < levels; i++) {
        tree.pathElements[i] <== pathElements[i];
        tree.pathIndices[i] <== pathIndices[i];
    }
}

component main {public [root, nullifierHash]} = LoginProof(5);