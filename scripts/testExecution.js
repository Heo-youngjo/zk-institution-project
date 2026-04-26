/**
 * testExecution.js
 *
 * OrderExecutor E2E 테스트:
 *   1. 기관이 createOrder() → 1000 mUSDC를 5청크로 분할
 *   2. executeAll()로 전체 집행 → 각 청크가 풀1→풀2→풀3→풀1→풀2 라운드로빈
 *   3. getFills()로 체결 내역 조회
 *   4. 만료 주문 cancelOrder() 테스트
 *
 * 실행:
 *   npx hardhat run scripts/testExecution.js --network localhost
 *
 * 전제조건:
 *   deploy_executor.js 가 먼저 실행되어 deployed.json 이 갱신돼 있어야 함.
 *   해당 기관 주소는 Registry.verifyLogin() 으로 세션이 살아있어야 함.
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const DEPLOYED_PATH = path.join(__dirname, "../data/deployed.json");

const EXECUTOR_ABI = [
  "function createOrder(address,address,uint256,uint256,uint256,uint256) external returns (uint256)",
  "function executeChunk(uint256) external returns (uint256)",
  "function executeAll(uint256) external returns (uint256)",
  "function cancelOrder(uint256) external",
  "function getOrderSummary(uint256) external view returns (address,uint256,uint256,uint256,uint256,uint256,uint8)",
  "function getFills(uint256) external view returns (tuple(uint256,uint256,address,uint256,uint256,uint256,uint256)[])",
  "function getUserOrders(address) external view returns (uint256[])",
];

const ERC20_ABI = [
  "function approve(address,uint256) external returns (bool)",
  "function balanceOf(address) external view returns (uint256)",
  "function mint(address,uint256) external",
];

const STATUS = ["PENDING", "PARTIAL", "FILLED", "CANCELLED", "EXPIRED"];

function fmt(bn) { return ethers.utils.formatEther(bn); }

async function main() {
  const [deployer, institution] = await ethers.getSigners();
  const deployed = JSON.parse(fs.readFileSync(DEPLOYED_PATH));

  const executor = new ethers.Contract(deployed.orderExecutor, EXECUTOR_ABI, institution);
  const tokenIn  = new ethers.Contract(deployed.tokenIn,  ERC20_ABI, institution);

  console.log("=".repeat(60));
  console.log("OrderExecutor E2E 테스트");
  console.log("Institution:", institution.address);
  console.log("=".repeat(60));

  // ── 잔고 확인 ──────────────────────────────────────────────────────────
  const balBefore = await tokenIn.balanceOf(institution.address);
  console.log("\n[Before] mUSDC 잔고:", fmt(balBefore));

  // ── 주문 파라미터 설정 ───────────────────────────────────────────────────
  const TOTAL_AMOUNT  = ethers.utils.parseEther("1000");  // 1,000 mUSDC
  const SPLIT_COUNT   = 5;                                 // 5청크
  const SLIPPAGE_BPS  = 100;                               // 1%
  const DEADLINE      = Math.floor(Date.now() / 1000) + 3600; // 1시간 후

  console.log("\n[주문 파라미터]");
  console.log("  전체 수량 :", fmt(TOTAL_AMOUNT), "mUSDC");
  console.log("  분할 청크 :", SPLIT_COUNT, "개");
  console.log("  청크 크기 :", fmt(TOTAL_AMOUNT.div(SPLIT_COUNT)), "mUSDC");
  console.log("  슬리피지  :", SLIPPAGE_BPS / 100, "%");
  console.log("  만료      :", new Date(DEADLINE * 1000).toLocaleTimeString("ko-KR"));

  // ── 1. Approve ──────────────────────────────────────────────────────────
  console.log("\n[1] tokenIn approve...");
  await tokenIn.approve(deployed.orderExecutor, TOTAL_AMOUNT);
  console.log("    ✓ approved");

  // ── 2. createOrder ──────────────────────────────────────────────────────
  console.log("\n[2] createOrder...");
  const tx1 = await executor.createOrder(
    deployed.tokenIn,
    deployed.tokenOut,
    TOTAL_AMOUNT,
    SPLIT_COUNT,
    SLIPPAGE_BPS,
    DEADLINE
  );
  const receipt1 = await tx1.wait();
  // OrderCreated 이벤트에서 orderId 파싱
  const orderId = receipt1.events
    .find(e => e.event === "OrderCreated")?.args?.orderId?.toNumber();
  console.log("    ✓ 주문 생성됨, orderId =", orderId);

  // ── 3. executeAll ───────────────────────────────────────────────────────
  console.log("\n[3] executeAll (5청크 라운드로빈 집행)...");
  const tx2 = await executor.executeAll(orderId);
  const receipt2 = await tx2.wait();

  const chunkEvents = receipt2.events.filter(e => e.event === "ChunkExecuted");
  console.log("    집행된 청크:", chunkEvents.length, "개");
  chunkEvents.forEach((e, i) => {
    const { chunkIndex, dexPool, amountIn, amountOut } = e.args;
    console.log(`    청크[${chunkIndex}] pool=${dexPool.slice(0,10)}... in=${fmt(amountIn)} mUSDC → out=${fmt(amountOut)} mWETH`);
  });

  // ── 4. 주문 요약 ────────────────────────────────────────────────────────
  console.log("\n[4] 주문 최종 상태:");
  const [user, total, splits, filled, totalOut, deadline, status] =
    await executor.getOrderSummary(orderId);
  console.log("    user       :", user);
  console.log("    totalAmount:", fmt(total), "mUSDC");
  console.log("    splitCount :", splits.toNumber());
  console.log("    filledChunks:", filled.toNumber());
  console.log("    totalOut   :", fmt(totalOut), "mWETH");
  console.log("    status     :", STATUS[status]);

  // ── 5. 체결 내역 상세 ───────────────────────────────────────────────────
  console.log("\n[5] 체결(Fill) 상세:");
  const fillList = await executor.getFills(orderId);
  fillList.forEach((f) => {
    const [_oid, idx, pool, amtIn, amtOut, execAt, slipBps] = f;
    console.log(
      `    Fill[${idx}] pool=${pool.slice(0,10)}... ` +
      `${fmt(amtIn)}→${fmt(amtOut)} ` +
      `slip=${slipBps}bps ` +
      `at=${new Date(execAt.toNumber() * 1000).toLocaleTimeString("ko-KR")}`
    );
  });

  // ── 6. 잔고 비교 ────────────────────────────────────────────────────────
  const balAfter = await tokenIn.balanceOf(institution.address);
  console.log("\n[잔고 변화]");
  console.log("  before:", fmt(balBefore), "mUSDC");
  console.log("  after :", fmt(balAfter),  "mUSDC");
  console.log("  spent :", fmt(balBefore.sub(balAfter)), "mUSDC");

  // ── 7. 취소 테스트 (새 주문으로) ────────────────────────────────────────
  console.log("\n[7] 취소 테스트 (새 주문 생성 후 즉시 취소)...");
  const SMALL = ethers.utils.parseEther("200");
  await tokenIn.approve(deployed.orderExecutor, SMALL);
  const tx3 = await executor.createOrder(
    deployed.tokenIn, deployed.tokenOut,
    SMALL, 2, 50,
    Math.floor(Date.now() / 1000) + 3600
  );
  const r3 = await tx3.wait();
  const cancelId = r3.events.find(e => e.event === "OrderCreated")?.args?.orderId?.toNumber();
  console.log("    취소 대상 orderId:", cancelId);

  await executor.cancelOrder(cancelId);
  const [,,,,,, cancelStatus] = await executor.getOrderSummary(cancelId);
  console.log("    취소 후 status:", STATUS[cancelStatus]);

  // ── 결과 파일 저장 ──────────────────────────────────────────────────────
  const result = {
    orderId,
    totalIn:  fmt(total) + " mUSDC",
    totalOut: fmt(totalOut) + " mWETH",
    fills:    fillList.length,
    status:   STATUS[status],
    testedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(__dirname, "../data/execution_result.json"),
    JSON.stringify(result, null, 2)
  );

  console.log("\n✅ E2E 테스트 완료. 결과 → data/execution_result.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
