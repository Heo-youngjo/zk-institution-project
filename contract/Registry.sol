// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Verifier.sol";

contract Registry {
    // 업로드한 Verifier.sol 기준 실제 컨트랙트명
    Groth16Verifier public verifier;
    address public owner;

    // 회로 public input[0]과 비교할 root
    uint256 public merkleRoot;

    // 회로 public input[1] = nullifierHash 재사용 방지
    mapping(uint256 => bool) public nullifiers;

    // 로그인 세션 만료 시각
    mapping(address => uint256) public sessionExpiresAt;

    // 세션 유지 시간
    uint256 public sessionTTL = 1 hours;

    event LoginVerified(uint256 nullifierHash, address indexed user, uint256 expiresAt);
    event RootUpdated(uint256 oldRoot, uint256 newRoot);
    event SessionTTLUpdated(uint256 oldTTL, uint256 newTTL);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(uint256 _root, address _verifier) {
        owner = msg.sender;
        merkleRoot = _root;
        verifier = Groth16Verifier(_verifier);
    }

    function verifyLogin(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[2] calldata input
    ) external {
        // 1) root 일치 확인
        require(input[0] == merkleRoot, "root mismatch");

        // 2) nullifier 재사용 방지
        uint256 nullifierHash = input[1];
        require(!nullifiers[nullifierHash], "Already used");

        // 3) ZK proof 검증
        require(verifier.verifyProof(a, b, c, input), "Invalid proof");

        // 4) 사용 처리
        nullifiers[nullifierHash] = true;

        // 5) 세션 부여
        uint256 expiresAt = block.timestamp + sessionTTL;
        sessionExpiresAt[msg.sender] = expiresAt;

        emit LoginVerified(nullifierHash, msg.sender, expiresAt);
    }

    function isLoggedIn(address user) public view returns (bool) {
        return sessionExpiresAt[user] >= block.timestamp;
    }

    function requireLoggedIn(address user) external view {
        require(isLoggedIn(user), "Session inactive");
    }

    function updateRoot(uint256 newRoot) external onlyOwner {
        uint256 oldRoot = merkleRoot;
        merkleRoot = newRoot;
        emit RootUpdated(oldRoot, newRoot);
    }

    function setSessionTTL(uint256 newTTL) external onlyOwner {
        uint256 oldTTL = sessionTTL;
        sessionTTL = newTTL;
        emit SessionTTLUpdated(oldTTL, newTTL);
    }
}