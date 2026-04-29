# ZK Institution DEX

ZK(영지식 증명) 기반 기관 인증 시스템과 DEX(탈중앙화 거래소) 주문 실행을 결합한 프로젝트입니다.

기관(증권사, 은행 등)의 신원을 **ZK 머클 증명**으로 온체인에서 익명 검증하고, 인증된 기관만이 대량 주문을 여러 DEX 풀에 분할 실행할 수 있는 MVP입니다.

---

## 프로젝트 구조

```
zk-institution-project/
├── circuits/          # circom ZK 회로 파일
├── contract/          # Solidity 스마트 컨트랙트
│   ├── Verifier.sol       # Groth16 ZK 증명 검증기 (snarkjs 생성)
│   ├── Registry.sol       # ZK 로그인 + 세션 관리
│   ├── OrderGateway.sol   # 기본 주문 접수 게이트웨이
│   ├── OrderExecutor.sol  # 분할 주문 실행 + DEX 라우팅
│   ├── MockDEXPool.sol    # 테스트용 DEX 풀
│   └── MockERC20.sol      # 테스트용 ERC20 토큰
├── scripts/           # 데이터 생성 및 배포 스크립트
├── data/              # 생성된 기관 데이터, 머클 루트, 배포 주소
├── backend/           # Express 백엔드 (JWT 발급 + 주문 조회 API)
├── frontend/          # Next.js 프론트엔드 (DEX UI)
└── hardhat.config.js  # Hardhat 설정
```

---

## 동작 흐름

```
기관 데이터 생성 (CSV)
    ↓
머클 트리 구성 → 루트 해시 추출
    ↓
ZK 입력 파일 생성 (input_N.json)
    ↓
snarkjs로 ZK 증명 생성 (proof.json, public.json)
    ↓
스마트 컨트랙트 배포 (Verifier, Registry, OrderExecutor 등)
    ↓
프론트엔드에서 ZK 로그인 → 온체인 세션 활성화
    ↓
인증된 기관이 대량 주문 생성 → 복수 DEX 풀에 분할 실행
```

---

## 사전 요구사항

- Node.js 18+
- [snarkjs](https://github.com/iden3/snarkjs) (`npm install -g snarkjs`)
- [circom](https://docs.circom.io/getting-started/installation/) (ZK 회로 컴파일용, `circom.exe` 또는 시스템 설치)
- MetaMask 브라우저 확장

---

## 실행 순서

### 1단계: 의존성 설치

루트(Hardhat), 백엔드, 프론트엔드 각각의 의존성을 설치합니다.

```bash
# 루트 (Hardhat + 스크립트)
npm install

# 백엔드
cd backend && npm install && cd ..

# 프론트엔드
cd frontend && npm install && cd ..
```

---

### 2단계: 기관 데이터 생성 (최초 1회)

이미 `data/agencies_data.csv`가 있다면 건너뛰어도 됩니다.

```bash
node scripts/01_generate_data.js
# → data/agencies_data.csv 생성 (32개 기관, Secret/Nullifier/Commitment 포함)
```

---

### 3단계: 머클 트리 구성 및 루트 추출

```bash
node scripts/02_build_tree.js
# → 콘솔에 머클 루트 출력 (0x...)
```

출력된 루트 값을 `scripts/deploy.js`의 `root` 변수에 붙여넣습니다.

---

### 4단계: ZK 입력 파일 생성

N번 기관(0~31)의 로그인 증명 입력을 생성합니다.

```bash
node scripts/03_make_input.js 0
# → data/input_0.json 생성
```

---

### 5단계: ZK 회로 컴파일 및 증명 생성

ZK 회로는 사전에 컴파일된 `login.wasm`과 `login_final.zkey`가 필요합니다.  
(아래는 처음 설정하는 경우 — 이미 `frontend/public/` 에 파일이 있으면 건너뜀)

```bash
# 회로 컴파일 (circom 필요)
circom circuits/login.circom --wasm --r1cs -o build/

# Powers of Tau (Groth16 trusted setup)
snarkjs powersoftau new bn128 14 build/pot14_0000.ptau -v
snarkjs powersoftau contribute build/pot14_0000.ptau build/pot14_0001.ptau --name="First"
snarkjs powersoftau prepare phase2 build/pot14_0001.ptau build/pot14_final.ptau

# 회로별 셋업
snarkjs groth16 setup build/login.r1cs build/pot14_final.ptau build/login_0000.zkey
snarkjs zkey contribute build/login_0000.zkey build/login_final.zkey --name="Contrib"
snarkjs zkey export verificationkey build/login_final.zkey build/verification_key.json

# Solidity Verifier 생성 → contract/Verifier.sol 덮어쓰기
snarkjs zkey export solidityverifier build/login_final.zkey contract/Verifier.sol

# .wasm과 .zkey를 프론트엔드 public 폴더로 복사
cp build/login_js/login.wasm frontend/public/
cp build/login_final.zkey frontend/public/
```

ZK 증명 생성 (로컬 테스트용):

```bash
snarkjs groth16 fullprove data/input_0.json build/login_js/login.wasm build/login_final.zkey build/proof.json build/public.json
```

---

### 6단계: Hardhat 로컬 네트워크 실행

새 터미널을 열어 계속 실행 상태로 유지합니다.

```bash
npx hardhat node
```

---

### 7단계: 스마트 컨트랙트 배포

```bash
# 1) Verifier, Registry, OrderGateway 배포
npx hardhat run scripts/deploy.js --network localhost

# 2) MockERC20, MockDEXPool, OrderExecutor 배포
npx hardhat run scripts/deploy_executor.js --network localhost
```

배포 후 `data/deployed.json`에 컨트랙트 주소가 저장됩니다.

---

### 8단계: 프론트엔드 주소 동기화

배포된 컨트랙트 주소를 프론트엔드로 자동 복사합니다.

```bash
node scripts/sync-frontend-addresses.js
```

---

### 9단계: 백엔드 서버 실행

```bash
cd backend

# .env 파일 생성 (.env.example 참고)
cp .env.example .env
# .env를 열어 JWT_SECRET을 임의의 문자열로 변경 권장

npm run dev
# → http://localhost:4000 에서 실행
```

백엔드 API 목록:
- `POST /api/auth/login` — ZK 온체인 세션 확인 후 JWT 발급
- `GET  /api/auth/me` — 현재 세션 정보
- `GET  /api/orders` — 주문 목록 조회
- `GET  /api/portfolio` — 포트폴리오 조회

---

### 10단계: 프론트엔드 실행

```bash
cd frontend
npm run dev
# → http://localhost:3000 에서 실행
```

---

## MetaMask 설정

Hardhat 로컬 네트워크에 MetaMask를 연결합니다.

| 항목 | 값 |
|------|-----|
| 네트워크 이름 | Hardhat Local |
| RPC URL | `http://127.0.0.1:8545` |
| 체인 ID | `31337` |
| 통화 기호 | ETH |

Hardhat 노드 실행 시 출력되는 개인키를 MetaMask에 가져와 사용합니다.

---

## 전체 서버 요약

| 서버 | 명령어 | 포트 |
|------|--------|------|
| Hardhat 노드 | `npx hardhat node` | 8545 |
| 백엔드 | `cd backend && npm run dev` | 4000 |
| 프론트엔드 | `cd frontend && npm run dev` | 3000 |

---

## 주요 컨트랙트 설명

### Registry.sol
- ZK 증명을 검증하고 주소별 로그인 세션(1시간)을 발급합니다.
- nullifier 재사용을 방지해 동일 증명의 이중 사용을 막습니다.

### OrderExecutor.sol
- ZK 로그인된 기관만 대량 주문을 생성할 수 있습니다.
- 주문을 여러 청크로 분할하여 등록된 DEX 풀에 라운드로빈 방식으로 실행합니다.
- 최대 20개 청크, 최대 슬리피지 10% 제한이 있습니다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| ZK 증명 | circom, snarkjs (Groth16) |
| 해시 함수 | Poseidon (circomlibjs) |
| 스마트 컨트랙트 | Solidity 0.8.20, Hardhat |
| 백엔드 | Node.js, Express, TypeScript, JWT |
| 프론트엔드 | Next.js 16, React 19, wagmi, viem, Tailwind CSS |
